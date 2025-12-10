"""
EPUB Generation Service - Convert documents to EPUB format for Readium
"""
import os
import tempfile
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from ebooklib import epub
from bs4 import BeautifulSoup


class EpubGenerationService:
    """Convert TipTap JSON documents to EPUB format"""
    
    @staticmethod
    def tiptap_to_html(content: Any) -> str:
        """
        Convert TipTap JSON content to HTML
        
        Args:
            content: TipTap JSON content (dict or string)
            
        Returns:
            HTML string
        """
        if isinstance(content, str):
            # Plain text content
            return f"<p>{content}</p>"
        
        if not isinstance(content, dict):
            return ""
        
        def process_node(node: dict) -> str:
            """Recursively process TipTap nodes"""
            node_type = node.get("type", "")
            attrs = node.get("attrs", {})
            content = node.get("content", [])
            marks = node.get("marks", [])
            text = node.get("text", "")
            
            # Text node with marks (bold, italic, etc.)
            if node_type == "text":
                html = text
                # Apply marks
                for mark in marks:
                    mark_type = mark.get("type")
                    if mark_type == "bold":
                        html = f"<strong>{html}</strong>"
                    elif mark_type == "italic":
                        html = f"<em>{html}</em>"
                    elif mark_type == "code":
                        html = f"<code>{html}</code>"
                    elif mark_type == "link":
                        href = mark.get("attrs", {}).get("href", "#")
                        html = f'<a href="{href}">{html}</a>'
                    elif mark_type == "strike":
                        html = f"<s>{html}</s>"
                    elif mark_type == "underline":
                        html = f"<u>{html}</u>"
                return html
            
            # Process child content
            children_html = "".join(process_node(child) for child in content)
            
            # Block nodes
            if node_type == "paragraph":
                return f"<p>{children_html}</p>\n"
            elif node_type == "heading":
                level = attrs.get("level", 1)
                return f"<h{level}>{children_html}</h{level}>\n"
            elif node_type == "blockquote":
                return f"<blockquote>{children_html}</blockquote>\n"
            elif node_type == "codeBlock":
                language = attrs.get("language", "")
                return f'<pre><code class="language-{language}">{children_html}</code></pre>\n'
            elif node_type == "bulletList":
                return f"<ul>{children_html}</ul>\n"
            elif node_type == "orderedList":
                start = attrs.get("start", 1)
                return f'<ol start="{start}">{children_html}</ol>\n'
            elif node_type == "listItem":
                return f"<li>{children_html}</li>\n"
            elif node_type == "hardBreak":
                return "<br/>\n"
            elif node_type == "horizontalRule":
                return "<hr/>\n"
            elif node_type == "image":
                src = attrs.get("src", "")
                alt = attrs.get("alt", "")
                title = attrs.get("title", "")
                return f'<img src="{src}" alt="{alt}" title="{title}"/>\n'
            elif node_type == "table":
                return f"<table>{children_html}</table>\n"
            elif node_type == "tableRow":
                return f"<tr>{children_html}</tr>\n"
            elif node_type == "tableCell":
                return f"<td>{children_html}</td>\n"
            elif node_type == "tableHeader":
                return f"<th>{children_html}</th>\n"
            elif node_type == "doc":
                # Root document node
                return children_html
            
            # Unknown node type - just process children
            return children_html
        
        return process_node(content)
    
    @staticmethod
    async def generate_epub(
        title: str,
        author: str,
        content: Any,
        description: Optional[str] = None,
        language: str = "en",
        cover_image_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate an EPUB file from document content
        
        Args:
            title: Book title
            author: Author name
            content: TipTap JSON content
            description: Book description
            language: Language code (default: en)
            cover_image_path: Path to cover image (optional)
            
        Returns:
            Dict with:
                - epub_path: Path to generated EPUB file
                - file_size: Size in bytes
                - file_hash: SHA-256 hash
        """
        # Create EPUB book
        book = epub.EpubBook()
        
        # Set metadata
        book.set_identifier(f"workshelf-{datetime.now(timezone.utc).timestamp()}")
        book.set_title(title)
        book.set_language(language)
        book.add_author(author)
        
        if description:
            book.add_metadata('DC', 'description', description)
        
        # Add Dublin Core metadata
        book.add_metadata('DC', 'publisher', 'WorkShelf')
        book.add_metadata('DC', 'date', datetime.now(timezone.utc).strftime('%Y-%m-%d'))
        
        # Convert TipTap content to HTML
        html_content = EpubGenerationService.tiptap_to_html(content)
        
        # Create chapter
        chapter = epub.EpubHtml(
            title=title,
            file_name='content.xhtml',
            lang=language
        )
        
        # Wrap content in proper HTML structure
        chapter_html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>{title}</title>
    <style>
        body {{
            font-family: Georgia, serif;
            line-height: 1.6;
            margin: 2em;
        }}
        h1, h2, h3 {{
            font-weight: bold;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }}
        h1 {{ font-size: 2em; }}
        h2 {{ font-size: 1.5em; }}
        h3 {{ font-size: 1.2em; }}
        p {{
            margin: 1em 0;
            text-align: justify;
        }}
        blockquote {{
            margin: 1em 2em;
            padding-left: 1em;
            border-left: 3px solid #ccc;
            font-style: italic;
        }}
        code {{
            font-family: "Courier New", monospace;
            background-color: #f4f4f4;
            padding: 2px 4px;
        }}
        pre {{
            background-color: #f4f4f4;
            padding: 1em;
            overflow-x: auto;
        }}
        img {{
            max-width: 100%;
            height: auto;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }}
        th {{
            background-color: #f4f4f4;
            font-weight: bold;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""
        
        chapter.set_content(chapter_html.encode('utf-8'))
        book.add_item(chapter)
        
        # Add cover image if provided
        if cover_image_path and os.path.exists(cover_image_path):
            with open(cover_image_path, 'rb') as cover_file:
                cover_image = cover_file.read()
                book.set_cover('cover.jpg', cover_image)
        
        # Create table of contents
        book.toc = (epub.Link('content.xhtml', title, 'content'),)
        
        # Add navigation files
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        
        # Create spine
        book.spine = ['nav', chapter]
        
        # Generate EPUB file
        temp_dir = tempfile.gettempdir()
        epub_filename = f"{hashlib.md5(title.encode()).hexdigest()}.epub"
        epub_path = os.path.join(temp_dir, epub_filename)
        
        # Write EPUB
        epub.write_epub(epub_path, book, {})
        
        # Calculate file info
        file_size = os.path.getsize(epub_path)
        
        with open(epub_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        
        return {
            "epub_path": epub_path,
            "file_size": file_size,
            "file_hash": file_hash
        }
