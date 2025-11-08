#!/usr/bin/env python3
"""
Test script to create a sample author edit for moderation demo.
Uses the API directly to create a pending edit.
"""
import requests
import json

API_BASE = "http://localhost:8000"

def create_test_edit():
    """Create a test author edit via the API."""
    
    print("🔍 Step 1: Finding an author to edit...")
    
    # Get list of authors
    response = requests.get(f"{API_BASE}/api/v1/authors/search?q=")
    if response.status_code != 200:
        print(f"❌ Failed to fetch authors: {response.status_code}")
        return
    
    authors = response.json()
    if not authors:
        print("⚠️  No authors found. Please add some authors first.")
        return
    
    # Use the first author
    author = authors[0]
    author_id = author['id']
    author_name = author['name']
    
    print(f"✅ Found author: {author_name} (ID: {author_id})")
    
    # You need to be logged in to submit an edit
    # For now, let's just show the curl command to run
    print(f"\n📝 To test the moderation flow, run this command:")
    print(f"\n(First, get your auth token by logging in, then run:)\n")
    
    curl_command = f'''curl -X POST "{API_BASE}/api/v1/authors/{author_id}/edit" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{{"field_name": "bio", "new_value": "Updated biography with more comprehensive information about their career and achievements. This is a test edit to demonstrate the moderation system.", "edit_summary": "Testing moderation flow"}}'
'''
    
    print(curl_command)
    print(f"\n🎉 After running this command:")
    print(f"   1. Navigate to: http://localhost:5173/admin/moderation")
    print(f"   2. Log in with your admin account")
    print(f"   3. You'll see the pending edit in the queue!")
    print(f"   4. Click to expand it and see the diff")
    print(f"   5. Approve or reject with a reason")
    
    # Alternative: Show JavaScript fetch version
    print(f"\n📱 Or use this in the browser console (after logging in):")
    js_code = f'''
fetch('{API_BASE}/api/v1/authors/{author_id}/edit', {{
  method: 'POST',
  headers: {{
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }},
  body: JSON.stringify({{
    field_name: 'bio',
    new_value: 'Updated biography with comprehensive information. This is a test edit.',
    edit_summary: 'Testing moderation flow'
  }})
}})
.then(r => r.json())
.then(d => console.log('Edit created:', d))
'''
    print(js_code)


if __name__ == "__main__":
    create_test_edit()
