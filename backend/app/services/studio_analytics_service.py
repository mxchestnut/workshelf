"""
Studio Analytics Service - Phase 5
Provides analytics and metrics for studios and documents
"""
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Studio, StudioAnalytics, DocumentView,
    Document, Comment, ShareLink, Bookmark, User
)


class StudioAnalyticsService:
    """Service for studio analytics and metrics."""
    
    @staticmethod
    async def get_studio_metrics(
        db: AsyncSession,
        studio_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """Get comprehensive studio metrics."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get all documents for this studio
        doc_result = await db.execute(
            select(Document.id).where(
                and_(
                    Document.studio_id == studio_id,
                    Document.created_at >= start_date,
                    Document.created_at <= end_date
                )
            )
        )
        document_ids = [row[0] for row in doc_result]
        
        # View metrics
        total_views_result = await db.execute(
            select(func.count(DocumentView.id)).where(
                and_(
                    DocumentView.document_id.in_(document_ids) if document_ids else False,
                    DocumentView.created_at >= start_date,
                    DocumentView.created_at <= end_date
                )
            )
        )
        total_views = total_views_result.scalar() or 0
        
        unique_views_result = await db.execute(
            select(func.count(DocumentView.id)).where(
                and_(
                    DocumentView.document_id.in_(document_ids) if document_ids else False,
                    DocumentView.is_unique == True,
                    DocumentView.created_at >= start_date,
                    DocumentView.created_at <= end_date
                )
            )
        )
        unique_views = unique_views_result.scalar() or 0
        
        # Average view duration
        avg_duration_result = await db.execute(
            select(func.avg(DocumentView.view_duration)).where(
                and_(
                    DocumentView.document_id.in_(document_ids) if document_ids else False,
                    DocumentView.view_duration.isnot(None),
                    DocumentView.created_at >= start_date,
                    DocumentView.created_at <= end_date
                )
            )
        )
        avg_duration = avg_duration_result.scalar() or 0
        
        # Document counts
        total_docs_result = await db.execute(
            select(func.count(Document.id)).where(
                and_(
                    Document.studio_id == studio_id,
                    Document.created_at >= start_date,
                    Document.created_at <= end_date
                )
            )
        )
        total_documents = total_docs_result.scalar() or 0
        
        published_docs_result = await db.execute(
            select(func.count(Document.id)).where(
                and_(
                    Document.studio_id == studio_id,
                    Document.status == "published",
                    Document.created_at >= start_date,
                    Document.created_at <= end_date
                )
            )
        )
        published_documents = published_docs_result.scalar() or 0
        
        # Engagement metrics
        comments_result = await db.execute(
            select(func.count(Comment.id)).where(
                and_(
                    Comment.document_id.in_(document_ids) if document_ids else False,
                    Comment.created_at >= start_date,
                    Comment.created_at <= end_date
                )
            )
        )
        total_comments = comments_result.scalar() or 0
        
        shares_result = await db.execute(
            select(func.count(ShareLink.id)).where(
                and_(
                    ShareLink.document_id.in_(document_ids) if document_ids else False,
                    ShareLink.created_at >= start_date,
                    ShareLink.created_at <= end_date
                )
            )
        )
        total_shares = shares_result.scalar() or 0
        
        bookmarks_result = await db.execute(
            select(func.count(Bookmark.id)).where(
                and_(
                    Bookmark.document_id.in_(document_ids) if document_ids else False,
                    Bookmark.created_at >= start_date,
                    Bookmark.created_at <= end_date
                )
            )
        )
        total_bookmarks = bookmarks_result.scalar() or 0
        
        # Top countries (from views)
        countries_result = await db.execute(
            select(
                DocumentView.country_code,
                func.count(DocumentView.id).label('count')
            )
            .where(
                and_(
                    DocumentView.document_id.in_(document_ids) if document_ids else False,
                    DocumentView.country_code.isnot(None),
                    DocumentView.created_at >= start_date,
                    DocumentView.created_at <= end_date
                )
            )
            .group_by(DocumentView.country_code)
            .order_by(func.count(DocumentView.id).desc())
            .limit(10)
        )
        top_countries = [
            {"country": row.country_code, "count": row.count}
            for row in countries_result
        ]
        
        # Top referrers
        referrers_result = await db.execute(
            select(
                DocumentView.referrer,
                func.count(DocumentView.id).label('count')
            )
            .where(
                and_(
                    DocumentView.document_id.in_(document_ids) if document_ids else False,
                    DocumentView.referrer.isnot(None),
                    DocumentView.created_at >= start_date,
                    DocumentView.created_at <= end_date
                )
            )
            .group_by(DocumentView.referrer)
            .order_by(func.count(DocumentView.id).desc())
            .limit(10)
        )
        top_referrers = [
            {"referrer": row.referrer, "count": row.count}
            for row in referrers_result
        ]
        
        return {
            "studio_id": studio_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "views": {
                "total": total_views,
                "unique": unique_views,
                "avg_duration": int(avg_duration) if avg_duration else 0
            },
            "documents": {
                "total": total_documents,
                "published": published_documents
            },
            "engagement": {
                "comments": total_comments,
                "shares": total_shares,
                "bookmarks": total_bookmarks
            },
            "top_countries": top_countries,
            "top_referrers": top_referrers
        }
    
    @staticmethod
    async def get_document_metrics(
        db: AsyncSession,
        document_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """Get metrics for a specific document."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # View metrics
        total_views_result = await db.execute(
            select(func.count(DocumentView.id)).where(
                and_(
                    DocumentView.document_id == document_id,
                    DocumentView.created_at >= start_date,
                    DocumentView.created_at <= end_date
                )
            )
        )
        total_views = total_views_result.scalar() or 0
        
        unique_views_result = await db.execute(
            select(func.count(DocumentView.id)).where(
                and_(
                    DocumentView.document_id == document_id,
                    DocumentView.is_unique == True,
                    DocumentView.created_at >= start_date,
                    DocumentView.created_at <= end_date
                )
            )
        )
        unique_views = unique_views_result.scalar() or 0
        
        # Engagement
        comments_result = await db.execute(
            select(func.count(Comment.id)).where(
                and_(
                    Comment.document_id == document_id,
                    Comment.created_at >= start_date,
                    Comment.created_at <= end_date
                )
            )
        )
        total_comments = comments_result.scalar() or 0
        
        bookmarks_result = await db.execute(
            select(func.count(Bookmark.id)).where(
                and_(
                    Bookmark.document_id == document_id,
                    Bookmark.created_at >= start_date,
                    Bookmark.created_at <= end_date
                )
            )
        )
        total_bookmarks = bookmarks_result.scalar() or 0
        
        return {
            "document_id": document_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "views": {
                "total": total_views,
                "unique": unique_views
            },
            "engagement": {
                "comments": total_comments,
                "bookmarks": total_bookmarks
            }
        }
    
    @staticmethod
    async def get_time_series_data(
        db: AsyncSession,
        studio_id: int,
        metric: str = "views",
        days: int = 30
    ) -> List[Dict]:
        """Get time series data for a metric."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get all documents for this studio
        doc_result = await db.execute(
            select(Document.id).where(Document.studio_id == studio_id)
        )
        document_ids = [row[0] for row in doc_result]
        
        if metric == "views":
            # Group views by date
            result = await db.execute(
                select(
                    func.date(DocumentView.created_at).label('date'),
                    func.count(DocumentView.id).label('count')
                )
                .where(
                    and_(
                        DocumentView.document_id.in_(document_ids) if document_ids else False,
                        DocumentView.created_at >= start_date,
                        DocumentView.created_at <= end_date
                    )
                )
                .group_by(func.date(DocumentView.created_at))
                .order_by(func.date(DocumentView.created_at))
            )
            
            return [
                {"date": str(row.date), "value": row.count}
                for row in result
            ]
        
        return []
    
    @staticmethod
    async def save_daily_analytics(
        db: AsyncSession,
        studio_id: int,
        date: datetime
    ) -> StudioAnalytics:
        """Save daily analytics snapshot."""
        # Calculate metrics for the day
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        metrics = await StudioAnalyticsService.get_studio_metrics(
            db, studio_id, start_of_day, end_of_day
        )
        
        analytics = StudioAnalytics(
            studio_id=studio_id,
            date=date,
            period_type="daily",
            total_views=metrics["views"]["total"],
            unique_views=metrics["views"]["unique"],
            avg_view_duration=metrics["views"]["avg_duration"],
            total_documents=metrics["documents"]["total"],
            published_documents=metrics["documents"]["published"],
            total_comments=metrics["engagement"]["comments"],
            total_shares=metrics["engagement"]["shares"],
            total_bookmarks=metrics["engagement"]["bookmarks"],
            top_countries=metrics["top_countries"],
            top_referrers=metrics["top_referrers"]
        )
        db.add(analytics)
        await db.commit()
        await db.refresh(analytics)
        return analytics
