#!/usr/bin/env python3
"""
Test script for AI Template Generation API

This demonstrates how to:
1. Check if approved templates exist
2. Generate new templates if needed
3. View pending templates (staff only)
4. Approve templates (staff only)
"""

import requests
import json
from typing import List

# Configuration
API_BASE = "https://api.workshelf.dev/api/v1"
# API_BASE = "http://localhost:8000/api/v1"  # For local testing

# You'll need to get a JWT token first by logging in
# See Credentials.md for test users
ACCESS_TOKEN = "YOUR_JWT_TOKEN_HERE"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}


def check_existing_templates(interests: List[str]):
    """Check if approved templates already exist for given interests"""
    print(f"\n🔍 Checking for existing templates for: {interests}")
    
    response = requests.post(
        f"{API_BASE}/ai/check-existing",
        headers=headers,
        json={"interests": interests}
    )
    
    if response.status_code == 200:
        templates = response.json()
        print(f"✅ Found {len(templates)} existing templates:")
        for template in templates:
            print(f"  - {template['name']} (used {template['usage_count']} times)")
        return templates
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return []


def generate_templates(interests: List[str], group_id: int = None, num_templates: int = 10):
    """Generate new AI templates based on interests"""
    print(f"\n🤖 Generating {num_templates} templates for: {interests}")
    
    payload = {
        "interests": interests,
        "num_templates": num_templates
    }
    
    if group_id:
        payload["group_id"] = group_id
    
    response = requests.post(
        f"{API_BASE}/ai/generate-templates",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ {data['message']}")
        print(f"⏱️  Generation time: {data['generation_time_ms']}ms")
        print(f"\n📋 Generated Templates:")
        
        for i, template in enumerate(data['templates'], 1):
            print(f"\n{i}. {template['name']} {template.get('icon', '')}")
            print(f"   Category: {template['category']}")
            print(f"   Interests: {', '.join(template['source_interests'])}")
            print(f"   Status: {template['status']}")
            print(f"   Sections: {len(template['sections'])} top-level sections")
            
            # Show first section as example
            if template['sections']:
                first_section = template['sections'][0]
                print(f"   Example section: '{first_section['title']}'")
                if 'ai_prompts' in first_section and first_section['ai_prompts']:
                    print(f"     - {len(first_section['ai_prompts'])} AI prompts")
        
        return data['templates']
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return []


def get_pending_templates():
    """Get all pending templates (STAFF ONLY)"""
    print(f"\n📋 Fetching pending templates (staff only)...")
    
    response = requests.get(
        f"{API_BASE}/ai/pending-templates",
        headers=headers
    )
    
    if response.status_code == 200:
        templates = response.json()
        print(f"✅ Found {len(templates)} pending templates:")
        
        for i, template in enumerate(templates, 1):
            print(f"\n{i}. {template['name']} {template.get('icon', '')}")
            print(f"   ID: {template['id']}")
            print(f"   Interests: {', '.join(template['source_interests'])}")
            print(f"   Generated: {template['generation_timestamp']}")
            print(f"   Sections: {len(template['sections'])}")
        
        return templates
    elif response.status_code == 403:
        print(f"❌ Permission denied: Only platform staff can view pending templates")
        return []
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return []


def approve_template(ai_template_id: int, review_notes: str = None, edits: dict = None):
    """Approve an AI template (STAFF ONLY)"""
    print(f"\n✅ Approving template {ai_template_id}...")
    
    payload = {
        "ai_template_id": ai_template_id
    }
    
    if review_notes:
        payload["review_notes"] = review_notes
    
    if edits:
        payload["edits"] = edits
    
    response = requests.post(
        f"{API_BASE}/ai/approve-template",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        template = response.json()
        print(f"✅ Template approved successfully!")
        print(f"   Name: {template['name']}")
        print(f"   Template ID: {template['id']}")
        print(f"   Usage count: {template['usage_count']}")
        return template
    elif response.status_code == 403:
        print(f"❌ Permission denied: Only platform staff can approve templates")
        return None
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None


def example_workflow():
    """
    Example workflow: Hieroscope group adds interests
    """
    print("=" * 70)
    print("🚀 AI Template Generation Workflow Example")
    print("=" * 70)
    
    # Hieroscope's interests
    interests = ["divination", "mysticism", "tarot", "symbolism"]
    group_id = 1  # Hieroscope group ID
    
    # Step 1: Check if approved templates already exist
    existing = check_existing_templates(interests)
    
    if existing:
        print("\n💡 Found existing approved templates! No need to generate new ones.")
        print("   Users will get these curated templates immediately.")
    else:
        print("\n💡 No existing templates found. Generating new ones with AI...")
        
        # Step 2: Generate new templates
        new_templates = generate_templates(
            interests=interests,
            group_id=group_id,
            num_templates=10
        )
        
        if new_templates:
            print("\n📌 Next Steps:")
            print("   1. Templates are saved with status='pending'")
            print("   2. Kit reviews them in Platform Admin Dashboard")
            print("   3. Kit can adopt (approve as-is) or edit before approving")
            print("   4. Once approved, future users with similar interests get these templates")
    
    # Step 3: Staff workflow (Kit's perspective)
    print("\n" + "=" * 70)
    print("👤 Staff Workflow (Kit's Dashboard)")
    print("=" * 70)
    
    pending = get_pending_templates()
    
    if pending:
        print("\n📝 Kit can now:")
        print("   - Review each template")
        print("   - Preview sections and AI prompts")
        print("   - Edit if needed (improve prompts, add sections)")
        print("   - Approve or reject")
        
        # Example: Approve first template
        if len(pending) > 0:
            template_to_approve = pending[0]
            print(f"\n🎯 Example: Approving template '{template_to_approve['name']}'...")
            
            # Uncomment to actually approve:
            # approve_template(
            #     ai_template_id=template_to_approve['id'],
            #     review_notes="Great template for divination groups! Made minor tweaks to prompts."
            # )


def test_specific_interests():
    """
    Test with different interest combinations
    """
    test_cases = [
        {
            "interests": ["science fiction", "worldbuilding", "space opera"],
            "description": "Sci-Fi Writing Group"
        },
        {
            "interests": ["business", "startup", "entrepreneurship"],
            "description": "Business Planning Group"
        },
        {
            "interests": ["D&D", "tabletop RPG", "campaign planning"],
            "description": "D&D Campaign Group"
        },
        {
            "interests": ["poetry", "creative writing", "spoken word"],
            "description": "Poetry Community"
        }
    ]
    
    print("=" * 70)
    print("🧪 Testing Multiple Interest Combinations")
    print("=" * 70)
    
    for test_case in test_cases:
        print(f"\n\n📋 Test Case: {test_case['description']}")
        print(f"Interests: {test_case['interests']}")
        
        # Check existing first
        existing = check_existing_templates(test_case['interests'])
        
        if not existing:
            print(f"   → Would generate new templates for this combination")
            # Uncomment to actually generate:
            # generate_templates(test_case['interests'], num_templates=5)
        else:
            print(f"   → Already has {len(existing)} approved templates!")


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                  AI Template Generation API Test                     ║
║                                                                      ║
║  This script demonstrates the AI template generation workflow:       ║
║  1. Check for existing approved templates                           ║
║  2. Generate new templates with Claude if none exist                ║
║  3. Staff review and approval process                               ║
║                                                                      ║
║  Before running:                                                     ║
║  - Set ACCESS_TOKEN to your JWT token                               ║
║  - Set API_BASE to your API URL                                     ║
║  - Ensure ANTHROPIC_API_KEY is set in backend .env                  ║
╚══════════════════════════════════════════════════════════════════════╝
    """)
    
    # Run example workflow
    example_workflow()
    
    # Uncomment to test multiple interest combinations:
    # test_specific_interests()
