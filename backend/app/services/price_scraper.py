"""
Price Scraper Service for WorkShelf Store
Scrapes competitor prices from Amazon, Google Books, and Apple Books
"""
import asyncio
import logging
from typing import Optional, Dict, List
from decimal import Decimal
import aiohttp
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class PriceScraper:
    """Service for scraping competitor book prices"""
    
    # User agent to avoid blocking
    USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    
    @staticmethod
    async def get_amazon_price(isbn: Optional[str], title: str, author: str) -> Optional[Decimal]:
        """
        Scrape book price from Amazon
        
        Args:
            isbn: Book ISBN (preferred for accurate matching)
            title: Book title
            author: Author name
            
        Returns:
            Decimal price or None if not found
        """
        try:
            async with aiohttp.ClientSession() as session:
                # Try ISBN search first (more accurate)
                if isbn:
                    url = f"https://www.amazon.com/s?k={isbn}"
                else:
                    # Fallback to title + author search
                    search_query = f"{title} {author}".replace(" ", "+")
                    url = f"https://www.amazon.com/s?k={search_query}&i=digital-text"
                
                headers = {"User-Agent": PriceScraper.USER_AGENT}
                
                async with session.get(url, headers=headers, timeout=10) as response:
                    if response.status != 200:
                        logger.warning(f"Amazon returned status {response.status}")
                        return None
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Look for Kindle price
                    price_elements = soup.select('.a-price-whole')
                    if price_elements:
                        price_text = price_elements[0].get_text().strip()
                        # Remove $ and convert to Decimal
                        price_value = price_text.replace('$', '').replace(',', '')
                        return Decimal(price_value)
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error scraping Amazon price: {e}")
            return None
    
    @staticmethod
    async def get_google_books_price(isbn: Optional[str], title: str) -> Optional[Decimal]:
        """
        Get book price from Google Books API
        
        Args:
            isbn: Book ISBN
            title: Book title
            
        Returns:
            Decimal price or None if not found
        """
        try:
            async with aiohttp.ClientSession() as session:
                # Google Books API is free and doesn't require auth for basic queries
                if isbn:
                    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
                else:
                    search_title = title.replace(" ", "+")
                    url = f"https://www.googleapis.com/books/v1/volumes?q={search_title}"
                
                async with session.get(url, timeout=10) as response:
                    if response.status != 200:
                        logger.warning(f"Google Books API returned status {response.status}")
                        return None
                    
                    data = await response.json()
                    
                    if 'items' in data and len(data['items']) > 0:
                        # Get first result
                        book = data['items'][0]
                        sale_info = book.get('saleInfo', {})
                        
                        # Check if book is for sale
                        if sale_info.get('saleability') == 'FOR_SALE':
                            retail_price = sale_info.get('retailPrice', {})
                            if 'amount' in retail_price:
                                return Decimal(str(retail_price['amount']))
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching Google Books price: {e}")
            return None
    
    @staticmethod
    async def get_apple_books_price(isbn: Optional[str], title: str, author: str) -> Optional[Decimal]:
        """
        Scrape book price from Apple Books (iTunes API)
        
        Args:
            isbn: Book ISBN
            title: Book title
            author: Author name
            
        Returns:
            Decimal price or None if not found
        """
        try:
            async with aiohttp.ClientSession() as session:
                # iTunes Search API
                search_term = f"{title} {author}".replace(" ", "+")
                url = f"https://itunes.apple.com/search?term={search_term}&media=ebook&limit=5"
                
                async with session.get(url, timeout=10) as response:
                    if response.status != 200:
                        logger.warning(f"Apple Books API returned status {response.status}")
                        return None
                    
                    data = await response.json()
                    
                    if 'results' in data and len(data['results']) > 0:
                        # Get first result
                        book = data['results'][0]
                        if 'price' in book and book['price'] > 0:
                            return Decimal(str(book['price']))
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching Apple Books price: {e}")
            return None
    
    @staticmethod
    async def get_market_prices(isbn: Optional[str], title: str, author: str) -> Dict[str, Optional[Decimal]]:
        """
        Get prices from all competitors concurrently
        
        Args:
            isbn: Book ISBN
            title: Book title
            author: Author name
            
        Returns:
            Dict with prices from each source
        """
        # Run all scrapers concurrently
        amazon_task = PriceScraper.get_amazon_price(isbn, title, author)
        google_task = PriceScraper.get_google_books_price(isbn, title)
        apple_task = PriceScraper.get_apple_books_price(isbn, title, author)
        
        results = await asyncio.gather(
            amazon_task,
            google_task,
            apple_task,
            return_exceptions=True
        )
        
        return {
            'amazon': results[0] if not isinstance(results[0], Exception) else None,
            'google': results[1] if not isinstance(results[1], Exception) else None,
            'apple': results[2] if not isinstance(results[2], Exception) else None,
        }
    
    @staticmethod
    def calculate_average_market_price(prices: Dict[str, Optional[Decimal]]) -> Optional[Decimal]:
        """
        Calculate average price from available market prices
        
        Args:
            prices: Dict of prices from different sources
            
        Returns:
            Average price or None if no prices available
        """
        valid_prices = [p for p in prices.values() if p is not None and p > 0]
        
        if not valid_prices:
            return None
        
        avg = sum(valid_prices) / len(valid_prices)
        return Decimal(str(round(avg, 2)))
    
    @staticmethod
    def get_lowest_market_price(prices: Dict[str, Optional[Decimal]]) -> Optional[Decimal]:
        """
        Get the lowest price from competitors
        
        Args:
            prices: Dict of prices from different sources
            
        Returns:
            Lowest price or None if no prices available
        """
        valid_prices = [p for p in prices.values() if p is not None and p > 0]
        
        if not valid_prices:
            return None
        
        return min(valid_prices)
