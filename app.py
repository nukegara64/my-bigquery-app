import os
import re
import xml.etree.ElementTree as ET
import time
from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

# Cache configuration (in-memory)
CACHE_DURATION_SECS = 300  # Cache for 5 minutes
cache_data = None
cache_timestamp = 0

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_to_text(html_content):
    """Strips HTML tags and clean up spacing for plain text usage."""
    # Replace links with text (e.g. <a href="url">text</a> -> text)
    text = re.sub(r'<a[^>]*>(.*?)</a>', r'\1', html_content)
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode common HTML entities
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'")
    # Normalize whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_release_notes_feed(xml_content):
    """Parses Atom feed content and extracts individual release items."""
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"XML Parsing Error: {e}")
        return []

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    items = []
    
    # Loop over entries
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        updated_iso = updated_elem.text if updated_elem is not None else ""
        
        # Extract link
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        link = link_elem.get('href') if link_elem is not None else ""
        if not link:
            link_elem = entry.find('atom:link', ns)
            link = link_elem.get('href') if link_elem is not None else ""
            
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split content by <h3> headers to get individual release items
        # Atom feed HTML content structure:
        # <h3>Feature</h3>
        # <p>...</p>
        parts = re.split(r'(?i)<h3>', content_html)
        
        # If there are no <h3> parts, treat the whole content as one item
        if len(parts) <= 1:
            if content_html.strip():
                items.append({
                    'id': f"{date_str.lower().replace(' ', '_')}_update",
                    'date': date_str,
                    'iso_date': updated_iso,
                    'category': 'Update',
                    'details_html': content_html,
                    'details_text': clean_html_to_text(content_html),
                    'link': link
                })
            continue
            
        for i, part in enumerate(parts[1:]):
            sub_parts = re.split(r'(?i)</h3>', part, 1)
            if len(sub_parts) == 2:
                category = sub_parts[0].strip()
                details = sub_parts[1].strip()
                
                # Create a unique ID for this item for UI selection
                item_id = f"{date_str.lower().replace(' ', '_')}_{category.lower()}_{i}"
                
                items.append({
                    'id': item_id,
                    'date': date_str,
                    'iso_date': updated_iso,
                    'category': category,
                    'details_html': details,
                    'details_text': clean_html_to_text(details),
                    'link': link
                })
                
    return items

def fetch_feed_data(force=False):
    """Fetches feed data from target URL, using cache if fresh and force=False."""
    global cache_data, cache_timestamp
    
    current_time = time.time()
    if not force and cache_data is not None and (current_time - cache_timestamp < CACHE_DURATION_SECS):
        return cache_data, False  # Returned from cache, is_fresh = False
        
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse items
        parsed_items = parse_release_notes_feed(response.content)
        
        # Update cache
        cache_data = parsed_items
        cache_timestamp = current_time
        return parsed_items, True  # Fetched fresh
    except Exception as e:
        print(f"Error fetching release notes: {e}")
        # If fetch fails but we have cached data, fall back to cache
        if cache_data is not None:
            return cache_data, False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases, is_fresh = fetch_feed_data(force=force_refresh)
        return jsonify({
            'success': True,
            'releases': releases,
            'is_fresh': is_fresh,
            'cached_at': cache_timestamp
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
