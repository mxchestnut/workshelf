#!/usr/bin/env python3
"""
Test script to check if all admin routes are defined
"""
import sys
sys.path.insert(0, '.')

try:
    from app.api import admin
    
    print(f"✅ Admin module imported successfully")
    print(f"📊 Router has {len(admin.router.routes)} routes\n")
    
    print("📋 All admin routes:")
    for i, route in enumerate(admin.router.routes, 1):
        path = getattr(route, 'path', 'N/A')
        methods = getattr(route, 'methods', set())
        name = getattr(route, 'name', 'N/A')
        print(f"{i}. {list(methods)[0] if methods else 'GET'} {path} ({name})")
        
    # Check specifically for store routes
    store_routes = [r for r in admin.router.routes if '/store' in getattr(r, 'path', '')]
    print(f"\n🏪 Store routes found: {len(store_routes)}")
    for route in store_routes:
        path = getattr(route, 'path', 'N/A')
        methods = getattr(route, 'methods', set())
        print(f"  - {list(methods)[0] if methods else 'GET'} {path}")
        
except Exception as e:
    print(f"❌ Error importing admin module: {e}")
    import traceback
    traceback.print_exc()
