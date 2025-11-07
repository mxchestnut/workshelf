"""
Seed the store with 100 popular books available for sale
"""
import asyncio
import os
import sys
from datetime import datetime
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.authors import Author
from app.models.store import StoreItem, StoreItemStatus


# Top 100 popular books with authors and pricing
BOOKS_DATA = [
    # Fiction Bestsellers
    {"title": "The Midnight Library", "author": "Matt Haig", "price": 12.99, "genre": "Fiction", "description": "A dazzling novel about all the choices that go into a life well lived."},
    {"title": "Where the Crawdads Sing", "author": "Delia Owens", "price": 14.99, "genre": "Fiction", "description": "A young woman who raised herself in the marshes of North Carolina becomes a suspect in a murder."},
    {"title": "The Seven Husbands of Evelyn Hugo", "author": "Taylor Jenkins Reid", "price": 13.99, "genre": "Fiction", "description": "Aging Hollywood star Evelyn Hugo finally tells the truth about her glamorous and scandalous life."},
    {"title": "Lessons in Chemistry", "author": "Bonnie Garmus", "price": 15.99, "genre": "Fiction", "description": "A chemist in the 1960s becomes a star on a cooking show and changes the status quo."},
    {"title": "Tomorrow, and Tomorrow, and Tomorrow", "author": "Gabrielle Zevin", "price": 14.99, "genre": "Fiction", "description": "Two friends build a video game empire and navigate the complexities of their relationship."},
    
    # Mystery/Thriller
    {"title": "The Silent Patient", "author": "Alex Michaelides", "price": 13.99, "genre": "Mystery", "description": "A woman's act of violence against her husband and her subsequent silence."},
    {"title": "Gone Girl", "author": "Gillian Flynn", "price": 12.99, "genre": "Thriller", "description": "A marriage goes dangerously wrong when a wife goes missing."},
    {"title": "The Girl on the Train", "author": "Paula Hawkins", "price": 11.99, "genre": "Thriller", "description": "A psychological thriller about obsession and dangerous consequences."},
    {"title": "The Woman in the Window", "author": "A.J. Finn", "price": 13.99, "genre": "Thriller", "description": "An agoraphobic woman witnesses a crime from her window."},
    {"title": "The Guest List", "author": "Lucy Foley", "price": 12.99, "genre": "Mystery", "description": "A wedding on a remote island turns deadly when a body is discovered."},
    
    # Romance
    {"title": "Book Lovers", "author": "Emily Henry", "price": 13.99, "genre": "Romance", "description": "A literary agent and a brooding editor find unexpected love."},
    {"title": "People We Meet on Vacation", "author": "Emily Henry", "price": 12.99, "genre": "Romance", "description": "Best friends take one last vacation to figure out their relationship."},
    {"title": "The Love Hypothesis", "author": "Ali Hazelwood", "price": 11.99, "genre": "Romance", "description": "A fake dating experiment in academia leads to real feelings."},
    {"title": "It Ends with Us", "author": "Colleen Hoover", "price": 13.99, "genre": "Romance", "description": "A relationship story that asks difficult questions about love."},
    {"title": "Red, White & Royal Blue", "author": "Casey McQuiston", "price": 12.99, "genre": "Romance", "description": "The son of the US President falls for a British prince."},
    
    # Fantasy/Sci-Fi
    {"title": "Fourth Wing", "author": "Rebecca Yarros", "price": 15.99, "genre": "Fantasy", "description": "A war college trains dragon riders in this romantasy epic."},
    {"title": "A Court of Thorns and Roses", "author": "Sarah J. Maas", "price": 14.99, "genre": "Fantasy", "description": "A retelling of Beauty and the Beast in a faerie world."},
    {"title": "Project Hail Mary", "author": "Andy Weir", "price": 14.99, "genre": "Science Fiction", "description": "A lone astronaut must save Earth from extinction."},
    {"title": "The Invisible Life of Addie LaRue", "author": "V.E. Schwab", "price": 14.99, "genre": "Fantasy", "description": "A woman makes a Faustian bargain to live forever but be forgotten."},
    {"title": "Dune", "author": "Frank Herbert", "price": 16.99, "genre": "Science Fiction", "description": "The epic science fiction masterpiece about desert planets and political intrigue."},
    
    # Historical Fiction
    {"title": "All the Light We Cannot See", "author": "Anthony Doerr", "price": 14.99, "genre": "Historical Fiction", "description": "A blind French girl and a German boy's paths collide in WWII."},
    {"title": "The Nightingale", "author": "Kristin Hannah", "price": 13.99, "genre": "Historical Fiction", "description": "Two sisters fight for survival during WWII in Nazi-occupied France."},
    {"title": "The Book Thief", "author": "Markus Zusak", "price": 12.99, "genre": "Historical Fiction", "description": "Death narrates the story of a girl stealing books in Nazi Germany."},
    {"title": "The Pillars of the Earth", "author": "Ken Follett", "price": 15.99, "genre": "Historical Fiction", "description": "Epic medieval saga of cathedral building in 12th-century England."},
    {"title": "Circe", "author": "Madeline Miller", "price": 13.99, "genre": "Historical Fiction", "description": "The witch from Homer's Odyssey tells her own story."},
    
    # Non-Fiction
    {"title": "Atomic Habits", "author": "James Clear", "price": 16.99, "genre": "Self-Help", "description": "Tiny changes that lead to remarkable results in habit formation."},
    {"title": "Educated", "author": "Tara Westover", "price": 14.99, "genre": "Memoir", "description": "A woman's quest for education despite growing up in rural Idaho."},
    {"title": "Sapiens", "author": "Yuval Noah Harari", "price": 17.99, "genre": "History", "description": "A brief history of humankind from the Stone Age to the present."},
    {"title": "Thinking, Fast and Slow", "author": "Daniel Kahneman", "price": 16.99, "genre": "Psychology", "description": "How two systems of thought shape our judgments and decisions."},
    {"title": "The Subtle Art of Not Giving a F*ck", "author": "Mark Manson", "price": 14.99, "genre": "Self-Help", "description": "A counterintuitive approach to living a good life."},
    
    # More Fiction
    {"title": "The Kite Runner", "author": "Khaled Hosseini", "price": 13.99, "genre": "Fiction", "description": "A powerful story of friendship, betrayal, and redemption in Afghanistan."},
    {"title": "Life of Pi", "author": "Yann Martel", "price": 12.99, "genre": "Fiction", "description": "A boy survives 227 days at sea with a Bengal tiger."},
    {"title": "The Alchemist", "author": "Paulo Coelho", "price": 11.99, "genre": "Fiction", "description": "A shepherd's journey to find treasure and his personal legend."},
    {"title": "1984", "author": "George Orwell", "price": 10.99, "genre": "Dystopian", "description": "A chilling prophecy about the future under totalitarian surveillance."},
    {"title": "Brave New World", "author": "Aldous Huxley", "price": 10.99, "genre": "Dystopian", "description": "A dystopian vision of a future society obsessed with pleasure."},
    
    # Young Adult
    {"title": "The Hunger Games", "author": "Suzanne Collins", "price": 11.99, "genre": "Young Adult", "description": "A televised fight to the death in a dystopian future."},
    {"title": "Harry Potter and the Sorcerer's Stone", "author": "J.K. Rowling", "price": 12.99, "genre": "Young Adult", "description": "A boy discovers he's a wizard and enters a magical world."},
    {"title": "The Fault in Our Stars", "author": "John Green", "price": 11.99, "genre": "Young Adult", "description": "Two teens with cancer fall in love and face life's challenges."},
    {"title": "Divergent", "author": "Veronica Roth", "price": 11.99, "genre": "Young Adult", "description": "A girl discovers she doesn't fit into society's factions."},
    {"title": "The Maze Runner", "author": "James Dashner", "price": 11.99, "genre": "Young Adult", "description": "Teens trapped in a maze must escape to survive."},
    
    # More Mystery/Thriller
    {"title": "Big Little Lies", "author": "Liane Moriarty", "price": 13.99, "genre": "Mystery", "description": "Three women's seemingly perfect lives unravel to a murder."},
    {"title": "The Da Vinci Code", "author": "Dan Brown", "price": 12.99, "genre": "Thriller", "description": "A murder in the Louvre leads to a stunning discovery."},
    {"title": "Sharp Objects", "author": "Gillian Flynn", "price": 12.99, "genre": "Thriller", "description": "A reporter returns to her hometown to cover disturbing murders."},
    {"title": "The Girl with the Dragon Tattoo", "author": "Stieg Larsson", "price": 13.99, "genre": "Mystery", "description": "A journalist and hacker investigate a decades-old disappearance."},
    {"title": "In the Woods", "author": "Tana French", "price": 12.99, "genre": "Mystery", "description": "A detective investigates a murder linked to his traumatic past."},
    
    # Literary Fiction
    {"title": "Normal People", "author": "Sally Rooney", "price": 13.99, "genre": "Literary Fiction", "description": "Two Irish teens navigate love and identity over the years."},
    {"title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "price": 9.99, "genre": "Literary Fiction", "description": "The classic tale of wealth, love, and the American Dream."},
    {"title": "To Kill a Mockingbird", "author": "Harper Lee", "price": 10.99, "genre": "Literary Fiction", "description": "A lawyer defends a Black man in Depression-era Alabama."},
    {"title": "Pride and Prejudice", "author": "Jane Austen", "price": 9.99, "genre": "Literary Fiction", "description": "The timeless romance between Elizabeth Bennet and Mr. Darcy."},
    {"title": "The Catcher in the Rye", "author": "J.D. Salinger", "price": 10.99, "genre": "Literary Fiction", "description": "A teen's disillusioned journey through New York City."},
    
    # More Fantasy
    {"title": "The Name of the Wind", "author": "Patrick Rothfuss", "price": 15.99, "genre": "Fantasy", "description": "A legendary magician tells his own story."},
    {"title": "The Way of Kings", "author": "Brandon Sanderson", "price": 16.99, "genre": "Fantasy", "description": "Epic fantasy with unique magic systems and complex characters."},
    {"title": "The Hobbit", "author": "J.R.R. Tolkien", "price": 12.99, "genre": "Fantasy", "description": "Bilbo Baggins' unexpected journey to reclaim treasure."},
    {"title": "The Lord of the Rings", "author": "J.R.R. Tolkien", "price": 18.99, "genre": "Fantasy", "description": "The epic quest to destroy the One Ring and save Middle-earth."},
    {"title": "A Game of Thrones", "author": "George R.R. Martin", "price": 15.99, "genre": "Fantasy", "description": "Noble families vie for control of the Iron Throne."},
    
    # More Non-Fiction
    {"title": "Becoming", "author": "Michelle Obama", "price": 16.99, "genre": "Memoir", "description": "The former First Lady's deeply personal memoir."},
    {"title": "The Immortal Life of Henrietta Lacks", "author": "Rebecca Skloot", "price": 14.99, "genre": "Biography", "description": "The story of the woman behind the immortal HeLa cells."},
    {"title": "Born a Crime", "author": "Trevor Noah", "price": 14.99, "genre": "Memoir", "description": "Stories from a South African childhood during apartheid."},
    {"title": "When Breath Becomes Air", "author": "Paul Kalanithi", "price": 13.99, "genre": "Memoir", "description": "A neurosurgeon's reflections on life and death."},
    {"title": "The Power of Now", "author": "Eckhart Tolle", "price": 14.99, "genre": "Self-Help", "description": "A guide to spiritual enlightenment and present-moment awareness."},
    
    # More Romance
    {"title": "The Hating Game", "author": "Sally Thorne", "price": 11.99, "genre": "Romance", "description": "Office enemies become lovers in this enemies-to-lovers rom-com."},
    {"title": "Beach Read", "author": "Emily Henry", "price": 12.99, "genre": "Romance", "description": "Two writers challenge each other to swap genres for the summer."},
    {"title": "The Kiss Quotient", "author": "Helen Hoang", "price": 11.99, "genre": "Romance", "description": "A woman with Asperger's hires an escort to teach her about dating."},
    {"title": "The Spanish Love Deception", "author": "Elena Armas", "price": 12.99, "genre": "Romance", "description": "A fake relationship becomes real on a trip to Spain."},
    {"title": "One Day", "author": "David Nicholls", "price": 12.99, "genre": "Romance", "description": "Twenty years of love, loss, and friendship between two people."},
    
    # More Historical Fiction
    {"title": "The Tattooist of Auschwitz", "author": "Heather Morris", "price": 13.99, "genre": "Historical Fiction", "description": "A love story set in the Auschwitz concentration camp."},
    {"title": "The Help", "author": "Kathryn Stockett", "price": 13.99, "genre": "Historical Fiction", "description": "Black maids in 1960s Mississippi tell their stories."},
    {"title": "The Alice Network", "author": "Kate Quinn", "price": 13.99, "genre": "Historical Fiction", "description": "Two women connected by World War I secrets."},
    {"title": "The Song of Achilles", "author": "Madeline Miller", "price": 13.99, "genre": "Historical Fiction", "description": "The love story between Achilles and Patroclus."},
    {"title": "Wolf Hall", "author": "Hilary Mantel", "price": 14.99, "genre": "Historical Fiction", "description": "Thomas Cromwell's rise to power in Henry VIII's court."},
    
    # More Sci-Fi
    {"title": "The Martian", "author": "Andy Weir", "price": 13.99, "genre": "Science Fiction", "description": "An astronaut stranded on Mars must science his way home."},
    {"title": "Ender's Game", "author": "Orson Scott Card", "price": 12.99, "genre": "Science Fiction", "description": "A child prodigy trained to lead Earth's military."},
    {"title": "Ready Player One", "author": "Ernest Cline", "price": 13.99, "genre": "Science Fiction", "description": "A treasure hunt in a virtual reality world."},
    {"title": "The Handmaid's Tale", "author": "Margaret Atwood", "price": 12.99, "genre": "Dystopian", "description": "A chilling vision of a totalitarian future for women."},
    {"title": "Neuromancer", "author": "William Gibson", "price": 12.99, "genre": "Science Fiction", "description": "The cyberpunk classic that defined a genre."},
    
    # More Thrillers
    {"title": "The Housemaid", "author": "Freida McFadden", "price": 11.99, "genre": "Thriller", "description": "A housemaid discovers dark secrets about her employers."},
    {"title": "Verity", "author": "Colleen Hoover", "price": 12.99, "genre": "Thriller", "description": "A writer discovers a manuscript that reveals shocking truths."},
    {"title": "The Last Thing He Told Me", "author": "Laura Dave", "price": 13.99, "genre": "Thriller", "description": "A woman searches for her missing husband's secrets."},
    {"title": "The Night Circus", "author": "Erin Morgenstern", "price": 13.99, "genre": "Fantasy", "description": "A magical competition between two young illusionists."},
    {"title": "Mexican Gothic", "author": "Silvia Moreno-Garcia", "price": 13.99, "genre": "Horror", "description": "Gothic horror in 1950s Mexico with family secrets."},
    
    # Contemporary Fiction
    {"title": "Eleanor Oliphant Is Completely Fine", "author": "Gail Honeyman", "price": 12.99, "genre": "Fiction", "description": "A socially awkward woman's journey to connection and healing."},
    {"title": "A Man Called Ove", "author": "Fredrik Backman", "price": 12.99, "genre": "Fiction", "description": "A curmudgeon's life changes when new neighbors move in."},
    {"title": "The Rosie Project", "author": "Graeme Simsion", "price": 11.99, "genre": "Fiction", "description": "A genetics professor seeks a wife through a scientific questionnaire."},
    {"title": "Little Fires Everywhere", "author": "Celeste Ng", "price": 13.99, "genre": "Fiction", "description": "Two families' lives intertwine with explosive consequences."},
    {"title": "The Curious Incident of the Dog in the Night-Time", "author": "Mark Haddon", "price": 11.99, "genre": "Fiction", "description": "A teen with autism investigates his neighbor's dog's death."},
    
    # More Literary Fiction
    {"title": "The Goldfinch", "author": "Donna Tartt", "price": 15.99, "genre": "Literary Fiction", "description": "A painting connects a boy to the art underworld."},
    {"title": "A Little Life", "author": "Hanya Yanagihara", "price": 14.99, "genre": "Literary Fiction", "description": "Four friends navigate decades of love, trauma, and redemption."},
    {"title": "The Underground Railroad", "author": "Colson Whitehead", "price": 14.99, "genre": "Literary Fiction", "description": "A literal underground railroad helps slaves escape to freedom."},
    {"title": "The Road", "author": "Cormac McCarthy", "price": 12.99, "genre": "Literary Fiction", "description": "A father and son journey through a post-apocalyptic America."},
    {"title": "Never Let Me Go", "author": "Kazuo Ishiguro", "price": 12.99, "genre": "Literary Fiction", "description": "Boarding school students discover their true purpose."},
    
    # More Young Adult
    {"title": "The Perks of Being a Wallflower", "author": "Stephen Chbosky", "price": 10.99, "genre": "Young Adult", "description": "A shy teen navigates high school through letters."},
    {"title": "Looking for Alaska", "author": "John Green", "price": 10.99, "genre": "Young Adult", "description": "A boarding school tragedy changes everything."},
    {"title": "Six of Crows", "author": "Leigh Bardugo", "price": 12.99, "genre": "Young Adult", "description": "A crew of criminals pulls off an impossible heist."},
    {"title": "The Giver", "author": "Lois Lowry", "price": 10.99, "genre": "Young Adult", "description": "A boy discovers the dark truth about his perfect society."},
    {"title": "An Ember in the Ashes", "author": "Sabaa Tahir", "price": 12.99, "genre": "Young Adult", "description": "A slave and a soldier in a brutal military empire."},
]


async def seed_store():
    """Seed the store with books"""
    async with AsyncSessionLocal() as session:
        try:
            print("🌱 Starting store seed process...")
            
            # Get seller user (first user in database, or None if no users exist)
            print("\n👤 Getting seller user...")
            from app.models.user import User
            result = await session.execute(select(User).order_by(User.id).limit(1))
            seller_user = result.scalar_one_or_none()
            
            if seller_user:
                seller_id = seller_user.id
                print(f"  ✓ Using user ID {seller_id} ({seller_user.email}) as seller")
            else:
                seller_id = None
                print("  ⚠️  No users found, books will have no seller")
            
            # Create a dict to track authors (avoid duplicates)
            authors_dict = {}
            
            # First, create all unique authors
            print("\n📚 Creating authors...")
            unique_authors = set(book["author"] for book in BOOKS_DATA)
            
            for author_name in unique_authors:
                # Check if author already exists
                result = await session.execute(
                    select(Author).where(Author.name == author_name)
                )
                existing_author = result.scalar_one_or_none()
                
                if existing_author:
                    authors_dict[author_name] = existing_author
                    print(f"  ✓ Author exists: {author_name}")
                else:
                    # Create new author
                    author = Author(
                        name=author_name,
                        bio=f"Acclaimed author of bestselling books.",
                        is_verified=True,
                        follower_count=0,
                        total_sales=0,
                        total_views=0
                    )
                    session.add(author)
                    await session.flush()  # Get the ID
                    authors_dict[author_name] = author
                    print(f"  ✓ Created author: {author_name}")
            
            await session.commit()
            print(f"\n✅ Created {len(authors_dict)} authors")
            
            # Now create the books
            print("\n📖 Creating books...")
            books_created = 0
            books_skipped = 0
            
            for book_data in BOOKS_DATA:
                # Check if book already exists
                result = await session.execute(
                    select(StoreItem).where(StoreItem.title == book_data["title"])
                )
                existing_book = result.scalar_one_or_none()
                
                if existing_book:
                    books_skipped += 1
                    continue
                
                author = authors_dict[book_data["author"]]
                
                # Create a simple hash for the title
                import hashlib
                file_hash = hashlib.sha256(book_data["title"].encode()).hexdigest()
                
                # Create store item
                store_item = StoreItem(
                    title=book_data["title"],
                    author_name=book_data["author"],
                    author_id=author.id,
                    description=book_data["description"],
                    genres=[book_data["genre"]],
                    price_usd=Decimal(str(book_data["price"])),
                    discount_percentage=0,
                    
                    # Use placeholder URLs (you can replace these with real EPUB files later)
                    epub_blob_url=f"https://example.com/epubs/{book_data['title'].lower().replace(' ', '-')}.epub",
                    cover_blob_url=f"https://covers.openlibrary.org/b/title/{book_data['title'].replace(' ', '+')}-L.jpg",
                    
                    file_size_bytes=2500000,  # ~2.5MB average
                    file_hash=file_hash,
                    page_count=350,
                    
                    status=StoreItemStatus.ACTIVE,
                    seller_id=seller_id,  # Use first user or None
                    publication_date=datetime(2023, 1, 1),
                    
                    # Sales data starts at 0
                    total_sales=0,
                    total_revenue=Decimal('0.00'),
                    rating_average=Decimal('4.5'),
                    rating_count=0,
                    view_count=0,
                    
                    # Feature some books
                    is_featured=(books_created < 10),  # First 10 are featured
                    is_bestseller=(books_created < 20),  # First 20 are bestsellers
                    is_new_release=(books_created < 15),  # First 15 are new
                )
                
                session.add(store_item)
                books_created += 1
                
                if books_created % 10 == 0:
                    print(f"  ✓ Created {books_created} books...")
            
            await session.commit()
            
            print(f"\n✅ Store seeded successfully!")
            print(f"   📚 {books_created} books created")
            print(f"   ⏭️  {books_skipped} books skipped (already exist)")
            print(f"   👥 {len(authors_dict)} authors total")
            print(f"\n🎉 Your store is ready to go!")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error seeding store: {e}")
            raise


if __name__ == "__main__":
    print("=" * 60)
    print("WorkShelf Store Seed Script")
    print("Adding 100 popular books to your store")
    print("=" * 60)
    asyncio.run(seed_store())
