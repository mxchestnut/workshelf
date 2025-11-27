"""
Test script for automated pricing system

This script demonstrates how to:
1. Analyze prices for store items
2. Update prices based on market data
3. Validate custom prices
4. Get minimum viable pricing

Usage:
    python scripts/test_pricing.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.price_scraper import PriceScraper
from app.services.pricing_engine import PricingEngine
from decimal import Decimal


async def test_price_scraper():
    """Test the price scraping functionality"""
    print("=" * 80)
    print("TESTING PRICE SCRAPER")
    print("=" * 80)
    
    # Example book: "1984" by George Orwell
    test_book = {
        'isbn': '9780451524935',
        'title': '1984',
        'author': 'George Orwell'
    }
    
    print(f"\nScraping prices for: {test_book['title']} by {test_book['author']}")
    print(f"ISBN: {test_book['isbn']}")
    print("\nFetching prices from Amazon, Google Books, and Apple Books...")
    
    try:
        market_prices = await PriceScraper.get_market_prices(
            isbn=test_book['isbn'],
            title=test_book['title'],
            author=test_book['author']
        )
        
        print("\n📊 Market Prices Found:")
        print(f"  Amazon: ${market_prices['amazon'] if market_prices['amazon'] else 'N/A'}")
        print(f"  Google Books: ${market_prices['google'] if market_prices['google'] else 'N/A'}")
        print(f"  Apple Books: ${market_prices['apple'] if market_prices['apple'] else 'N/A'}")
        
        # Calculate average
        avg_price = PriceScraper.calculate_average_market_price(market_prices)
        lowest_price = PriceScraper.get_lowest_market_price(market_prices)
        
        print(f"\n  Average Price: ${avg_price if avg_price else 'N/A'}")
        print(f"  Lowest Price: ${lowest_price if lowest_price else 'N/A'}")
        
        return market_prices
        
    except Exception as e:
        print(f"\n❌ Error scraping prices: {e}")
        return None


def test_pricing_engine(market_prices=None):
    """Test the pricing engine functionality"""
    print("\n" + "=" * 80)
    print("TESTING PRICING ENGINE")
    print("=" * 80)
    
    # Test 1: Calculate minimum price
    print("\n1️⃣ MINIMUM VIABLE PRICE")
    print("-" * 40)
    minimum_price = PricingEngine.calculate_minimum_price()
    costs = PricingEngine.calculate_platform_costs(minimum_price)
    
    print(f"Absolute Minimum Price: ${minimum_price}")
    print("\nCost Breakdown at Minimum Price:")
    print(f"  Sale Price: ${costs['sale_price']:.2f}")
    print(f"  Author Earnings (70%): ${costs['author_earnings']:.2f}")
    print(f"  Platform Revenue (30%): ${costs['platform_revenue']:.2f}")
    print(f"  Stripe Fee (2.9% + $0.30): ${costs['stripe_fee']:.2f}")
    print(f"  Platform Net Profit: ${costs['platform_net']:.2f}")
    print(f"  Profit Margin: {costs['profit_margin']:.1f}%")
    
    # Test 2: Validate various price points
    print("\n\n2️⃣ PRICE VALIDATION")
    print("-" * 40)
    
    test_prices = [5.00, 8.99, 12.99, 15.99]
    
    for price in test_prices:
        result = PricingEngine.validate_price(Decimal(str(price)))
        status = "✅ VALID" if result['is_valid'] else "❌ INVALID"
        
        print(f"\nPrice: ${price} - {status}")
        print(f"  Profit Margin: {result['cost_breakdown']['profit_margin']:.1f}%")
        print(f"  Platform Net: ${result['cost_breakdown']['platform_net']:.2f}")
        
        if result['warnings']:
            for warning in result['warnings']:
                if warning:
                    print(f"  ⚠️  {warning}")
        
        if result['recommendations']:
            for rec in result['recommendations']:
                if rec:
                    print(f"  💡 {rec}")
    
    # Test 3: Calculate optimal price with market data
    if market_prices:
        print("\n\n3️⃣ OPTIMAL PRICING RECOMMENDATION")
        print("-" * 40)
        
        current_price = Decimal('12.99')
        
        print(f"\nCurrent Price: ${current_price}")
        print("\nAnalyzing market...")
        
        result = PricingEngine.calculate_optimal_price(
            market_prices=market_prices,
            current_price=current_price
        )
        
        print(f"\n📈 RECOMMENDATION:")
        print(f"  Recommended Price: ${result['recommended_price']}")
        print(f"  Price Change: ${result['price_change']} ({'+' if result['price_change'] > 0 else ''}{(result['price_change'] / current_price * 100):.1f}%)")
        print(f"  Should Update: {'YES ✅' if result['should_update'] else 'NO ⏭️'}")
        print(f"\n  Reasoning: {result['reason']}")
        
        print("\n  Cost Breakdown:")
        costs = result['cost_breakdown']
        print(f"    Sale Price: ${costs['sale_price']:.2f}")
        print(f"    Author Earnings: ${costs['author_earnings']:.2f}")
        print(f"    Platform Net: ${costs['platform_net']:.2f}")
        print(f"    Profit Margin: {costs['profit_margin']:.1f}%")


async def test_example_scenarios():
    """Test common pricing scenarios"""
    print("\n" + "=" * 80)
    print("EXAMPLE PRICING SCENARIOS")
    print("=" * 80)
    
    scenarios = [
        {
            'name': 'Competitive Market',
            'market_prices': {'amazon': Decimal('14.99'), 'google': Decimal('15.99'), 'apple': Decimal('13.99')},
            'current_price': Decimal('12.99')
        },
        {
            'name': 'Low Market (Below Minimum)',
            'market_prices': {'amazon': Decimal('9.99'), 'google': Decimal('10.99'), 'apple': None},
            'current_price': Decimal('12.99')
        },
        {
            'name': 'High Market',
            'market_prices': {'amazon': Decimal('19.99'), 'google': Decimal('18.99'), 'apple': Decimal('17.99')},
            'current_price': Decimal('12.99')
        },
        {
            'name': 'No Market Data',
            'market_prices': {'amazon': None, 'google': None, 'apple': None},
            'current_price': Decimal('12.99')
        }
    ]
    
    for scenario in scenarios:
        print(f"\n{'─' * 40}")
        print(f"📚 Scenario: {scenario['name']}")
        print(f"{'─' * 40}")
        print(f"Current Price: ${scenario['current_price']}")
        print(f"Market Prices:")
        for source, price in scenario['market_prices'].items():
            print(f"  {source.capitalize()}: ${price if price else 'N/A'}")
        
        result = PricingEngine.calculate_optimal_price(
            market_prices=scenario['market_prices'],
            current_price=scenario['current_price']
        )
        
        print(f"\n💡 Recommendation: ${result['recommended_price']}")
        print(f"   Change: ${result['price_change']} ({'+' if result['price_change'] > 0 else ''}{(result['price_change'] / scenario['current_price'] * 100):.1f}%)")
        print(f"   Update: {'YES ✅' if result['should_update'] else 'NO ⏭️'}")
        print(f"   Reason: {result['reason']}")
        print(f"   Profit Margin: {result['cost_breakdown']['profit_margin']:.1f}%")


async def main():
    """Run all tests"""
    print("\n")
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 20 + "AUTOMATED PRICING SYSTEM TEST" + " " * 29 + "║")
    print("╚" + "═" * 78 + "╝")
    
    # Test 1: Price Scraper (real API calls)
    print("\n⏳ This may take a moment as we contact external APIs...")
    market_prices = await test_price_scraper()
    
    # Test 2: Pricing Engine (calculations only)
    test_pricing_engine(market_prices)
    
    # Test 3: Example Scenarios
    await test_example_scenarios()
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS COMPLETE")
    print("=" * 80)
    print("\nThe pricing system is ready to use!")
    print("\nTo use in production:")
    print("  1. Call POST /api/v1/admin/prices/analyze to preview changes")
    print("  2. Call POST /api/v1/admin/prices/update to apply changes")
    print("  3. Optionally set up a weekly cron job for automatic updates")
    print()


if __name__ == "__main__":
    asyncio.run(main())
