"""
Stripe Product Setup Script
Creates subscription products and prices for Work Shelf
Run this once to set up your Stripe account with the required products
"""

import os
import sys
import stripe
from pathlib import Path

# Add parent directory to path to import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

if not stripe.api_key:
    print("❌ Error: STRIPE_SECRET_KEY environment variable not set")
    print("   Make sure you're running this in the Docker container")
    sys.exit(1)

if stripe.api_key.startswith("sk_test"):
    print("⚠️  WARNING: Using TEST mode keys")
    print("   Products will be created in test mode")
    mode = "TEST"
elif stripe.api_key.startswith("sk_live"):
    print("✅ Using LIVE mode keys")
    print("   Products will be created in LIVE mode")
    mode = "LIVE"
else:
    print("❌ Error: Invalid Stripe API key format")
    sys.exit(1)

print("\n" + "="*70)
print(f"🚀 Creating Stripe Products ({mode} MODE)")
print("="*70)

# Product configurations
PRODUCTS = [
    {
        "name": "Pro",
        "description": "Professional tier with advanced AI features and unlimited documents",
        "features": [
            "Unlimited documents",
            "Advanced AI writing prompts",
            "Content integrity checks",
            "Priority support"
        ],
        "prices": {
            "monthly": {
                "amount": 999,  # $9.99 in cents
                "interval": "month"
            },
            "yearly": {
                "amount": 9900,  # $99/year ($8.25/month)
                "interval": "year"
            }
        }
    },
    {
        "name": "Premium",
        "description": "Premium tier with full AI capabilities and collaboration features",
        "features": [
            "Everything in Pro",
            "Unlimited AI generations",
            "Team collaboration",
            "Advanced analytics",
            "Custom integrations",
            "24/7 priority support"
        ],
        "prices": {
            "monthly": {
                "amount": 1999,  # $19.99 in cents
                "interval": "month"
            },
            "yearly": {
                "amount": 19900,  # $199/year ($16.58/month)
                "interval": "year"
            }
        }
    }
]

def create_product_and_prices(product_config):
    """Create a Stripe product with its associated prices"""
    
    name = product_config["name"]
    print(f"\n📦 Creating product: {name}")
    print("-" * 70)
    
    try:
        # Create the product
        product = stripe.Product.create(
            name=f"Work Shelf {name}",
            description=product_config["description"],
            metadata={
                "tier": name.lower(),
                "features": ", ".join(product_config["features"])
            }
        )
        
        print(f"   ✅ Product created: {product.id}")
        print(f"   Name: {product.name}")
        print(f"   Description: {product.description}")
        
        prices = {}
        
        # Create monthly price
        monthly_config = product_config["prices"]["monthly"]
        monthly_price = stripe.Price.create(
            product=product.id,
            unit_amount=monthly_config["amount"],
            currency="usd",
            recurring={
                "interval": monthly_config["interval"],
                "interval_count": 1
            },
            metadata={
                "tier": name.lower(),
                "billing_period": "monthly"
            }
        )
        prices["monthly"] = monthly_price
        
        monthly_display = f"${monthly_config['amount']/100:.2f}/month"
        print(f"   ✅ Monthly price created: {monthly_price.id}")
        print(f"      Amount: {monthly_display}")
        
        # Create yearly price
        yearly_config = product_config["prices"]["yearly"]
        yearly_price = stripe.Price.create(
            product=product.id,
            unit_amount=yearly_config["amount"],
            currency="usd",
            recurring={
                "interval": yearly_config["interval"],
                "interval_count": 1
            },
            metadata={
                "tier": name.lower(),
                "billing_period": "yearly"
            }
        )
        prices["yearly"] = yearly_price
        
        yearly_display = f"${yearly_config['amount']/100:.2f}/year"
        yearly_monthly = yearly_config['amount']/12/100
        print(f"   ✅ Yearly price created: {yearly_price.id}")
        print(f"      Amount: {yearly_display} (${yearly_monthly:.2f}/month)")
        
        return {
            "product": product,
            "prices": prices
        }
        
    except Exception as e:
        print(f"   ❌ Error creating {name}: {str(e)}")
        return None

def main():
    """Main execution"""
    
    results = {}
    
    # Create each product
    for product_config in PRODUCTS:
        result = create_product_and_prices(product_config)
        if result:
            results[product_config["name"].lower()] = result
    
    # Display summary
    print("\n" + "="*70)
    print("📋 SETUP SUMMARY")
    print("="*70)
    
    if not results:
        print("❌ No products were created")
        sys.exit(1)
    
    print("\n✅ Successfully created Stripe products!")
    print("\n📝 IMPORTANT: Save these Price IDs to your database:\n")
    
    # SQL generation for database update
    print("-- SQL to update subscription_tiers table:")
    print("-- (Run this in your database or update via admin panel)\n")
    
    for tier_name, result in results.items():
        monthly_price_id = result["prices"]["monthly"].id
        yearly_price_id = result["prices"]["yearly"].id
        
        print(f"-- {tier_name.upper()} Tier:")
        print(f"UPDATE subscription_tiers")
        print(f"SET stripe_monthly_price_id = '{monthly_price_id}',")
        print(f"    stripe_yearly_price_id = '{yearly_price_id}'")
        print(f"WHERE name = '{tier_name.capitalize()}';")
        print()
    
    # Display for manual reference
    print("\n" + "-"*70)
    print("📋 Price IDs for manual reference:")
    print("-"*70)
    
    for tier_name, result in results.items():
        product = result["product"]
        monthly = result["prices"]["monthly"]
        yearly = result["prices"]["yearly"]
        
        print(f"\n{tier_name.upper()}:")
        print(f"  Product ID: {product.id}")
        print(f"  Monthly Price ID: {monthly.id}")
        print(f"  Yearly Price ID:  {yearly.id}")
    
    print("\n" + "="*70)
    print("🎉 Stripe setup complete!")
    print("="*70)
    print("\nNext steps:")
    print("1. Update your database with the Price IDs shown above")
    print("2. Set up webhooks at: https://dashboard.stripe.com/webhooks")
    print("3. Configure STRIPE_WEBHOOK_SECRET in your environment")
    print("4. Test the subscription flow")
    print("\nView your products: https://dashboard.stripe.com/products")
    print("="*70)

if __name__ == "__main__":
    main()
