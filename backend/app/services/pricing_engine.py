"""
Pricing Engine for WorkShelf Store
Calculates optimal prices with minimum margin protection
"""
import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class PricingEngine:
    """Service for calculating optimal book prices"""
    
    # Platform revenue split configuration
    AUTHOR_SPLIT = Decimal('0.70')  # 70% to author
    PLATFORM_SPLIT = Decimal('0.30')  # 30% to platform
    
    # Stripe processing fees
    STRIPE_PERCENTAGE = Decimal('0.029')  # 2.9%
    STRIPE_FIXED = Decimal('0.30')  # $0.30
    
    # Minimum markup above costs (40% = 1.40x multiplier)
    MINIMUM_MARKUP = Decimal('1.40')  # 40% profit margin
    
    # Competitive pricing discount
    COMPETITIVE_DISCOUNT = Decimal('1.00')  # $1.00 below market
    
    @staticmethod
    def calculate_platform_costs(sale_price: Decimal) -> Dict[str, Decimal]:
        """
        Calculate all costs the platform incurs on a sale
        
        Args:
            sale_price: The final sale price to customer
            
        Returns:
            Dict with breakdown of costs
        """
        # Stripe fee calculation: (price * 2.9%) + $0.30
        stripe_fee = (sale_price * PricingEngine.STRIPE_PERCENTAGE) + PricingEngine.STRIPE_FIXED
        
        # Author gets 70% of sale price
        author_earnings = sale_price * PricingEngine.AUTHOR_SPLIT
        
        # Platform revenue is 30% minus Stripe fees
        platform_revenue = sale_price * PricingEngine.PLATFORM_SPLIT
        platform_net = platform_revenue - stripe_fee
        
        # Total cost to platform (what we pay out)
        total_costs = author_earnings + stripe_fee
        
        return {
            'sale_price': sale_price,
            'author_earnings': author_earnings.quantize(Decimal('0.01')),
            'stripe_fee': stripe_fee.quantize(Decimal('0.01')),
            'platform_revenue': platform_revenue.quantize(Decimal('0.01')),
            'platform_net': platform_net.quantize(Decimal('0.01')),
            'total_costs': total_costs.quantize(Decimal('0.01')),
            'profit_margin': ((platform_net / sale_price) * 100).quantize(Decimal('0.01'))
        }
    
    @staticmethod
    def calculate_minimum_price() -> Decimal:
        """
        Calculate the absolute minimum price we can charge
        This ensures we cover all costs and maintain minimum profit margin
        
        Formula:
        If x is the minimum price:
        x = (author_split * x) + stripe_fee + (minimum_profit * x)
        
        Solving for x:
        x = stripe_fixed / (1 - author_split - stripe_percentage - minimum_profit_percentage)
        
        Returns:
            Minimum viable price
        """
        # We need to solve for minimum price that gives us minimum markup
        # With 40% markup, platform net should be 40% of costs
        
        # Minimum profit margin we want (as percentage of sale price)
        min_profit_pct = Decimal('0.10')  # 10% net profit
        
        # Calculate minimum price that achieves this
        # x * (1 - 0.70 - 0.029) - 0.30 >= x * 0.10
        # x * 0.271 - 0.30 >= x * 0.10
        # x * 0.171 >= 0.30
        # x >= 0.30 / 0.171
        
        min_price = PricingEngine.STRIPE_FIXED / (
            Decimal('1') - 
            PricingEngine.AUTHOR_SPLIT - 
            PricingEngine.STRIPE_PERCENTAGE - 
            min_profit_pct
        )
        
        return min_price.quantize(Decimal('0.01'))
    
    @staticmethod
    def calculate_optimal_price(
        market_prices: Dict[str, Optional[Decimal]],
        current_price: Optional[Decimal] = None,
        minimum_price_override: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Calculate the optimal price based on market prices and minimum margins
        
        Strategy:
        1. Find lowest competitor price
        2. Calculate our minimum viable price (cost + 40% markup)
        3. If market price > minimum, price at (market - $1.00)
        4. If market price < minimum, price at minimum
        5. If no market data, keep current price or use minimum
        
        Args:
            market_prices: Dict of competitor prices
            current_price: Current price (if any)
            minimum_price_override: Override minimum calculation
            
        Returns:
            Dict with recommended price and reasoning
        """
        # Get absolute minimum price
        absolute_minimum = minimum_price_override or PricingEngine.calculate_minimum_price()
        
        # Find lowest market price
        valid_prices = [p for p in market_prices.values() if p is not None and p > 0]
        
        if not valid_prices:
            # No market data available
            if current_price and current_price >= absolute_minimum:
                # Keep current price if it's above minimum
                recommended_price = current_price
                reason = "No market data available - keeping current price"
            else:
                # Use minimum price
                recommended_price = absolute_minimum
                reason = "No market data available - using minimum viable price"
        else:
            # We have market data
            lowest_market = min(valid_prices)
            
            # Calculate competitive price (market - $1.00)
            competitive_price = (lowest_market - PricingEngine.COMPETITIVE_DISCOUNT).quantize(Decimal('0.01'))
            
            if competitive_price >= absolute_minimum:
                # We can undercut the market and still maintain margins
                recommended_price = competitive_price
                reason = f"Competitive pricing: ${PricingEngine.COMPETITIVE_DISCOUNT} below lowest market (${lowest_market})"
            else:
                # Market is too low, use minimum price
                recommended_price = absolute_minimum
                reason = f"Market price too low (${lowest_market}) - using minimum viable price"
        
        # Calculate cost breakdown at recommended price
        costs = PricingEngine.calculate_platform_costs(recommended_price)
        
        return {
            'recommended_price': recommended_price,
            'current_price': current_price,
            'price_change': (recommended_price - current_price) if current_price else None,
            'minimum_price': absolute_minimum,
            'market_prices': market_prices,
            'lowest_market_price': min(valid_prices) if valid_prices else None,
            'reason': reason,
            'cost_breakdown': costs,
            'should_update': current_price is None or abs(recommended_price - current_price) >= Decimal('0.50')
        }
    
    @staticmethod
    def validate_price(price: Decimal) -> Dict[str, Any]:
        """
        Validate if a price is acceptable and provide feedback
        
        Args:
            price: Price to validate
            
        Returns:
            Dict with validation result and feedback
        """
        minimum = PricingEngine.calculate_minimum_price()
        costs = PricingEngine.calculate_platform_costs(price)
        
        is_valid = price >= minimum and costs['platform_net'] > 0
        
        return {
            'is_valid': is_valid,
            'price': price,
            'minimum_price': minimum,
            'cost_breakdown': costs,
            'warnings': [
                f"Price is below minimum (${minimum})" if price < minimum else None,
                "Platform will lose money on this sale" if costs['platform_net'] < 0 else None,
                f"Very low profit margin ({costs['profit_margin']}%)" if costs['profit_margin'] < 5 else None
            ],
            'recommendations': [
                f"Increase price to at least ${minimum}" if price < minimum else None,
                f"Consider raising price to improve margins" if costs['profit_margin'] < 8 else None
            ]
        }
