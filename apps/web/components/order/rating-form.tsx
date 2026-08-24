'use client';

import { useState, useEffect, useCallback } from 'react';

interface RatingFormProps {
  orderId: string;
  visible: boolean;
  onRatingSubmitted?: () => void;
}

interface ExistingRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function RatingForm({ orderId, visible, onRatingSubmitted }: RatingFormProps) {
  const [existingRating, setExistingRating] = useState<ExistingRating | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      return;
    }

    const fetchRating = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/rating`);
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setExistingRating(data.data);
          }
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [orderId, visible]);

  const handleSubmit = useCallback(async () => {
    if (selectedRating < 1 || selectedRating > 5) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit rating');
      }

      setSuccess(true);
      onRatingSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  }, [orderId, selectedRating, comment, onRatingSubmitted]);

  if (!visible || loading) return null;

  // Already rated
  if (existingRating) {
    return (
      <div className="bg-white shadow rounded-lg p-4 border-l-4 border-yellow-500">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Your Rating</h3>
        <div className="flex items-center space-x-1 mb-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-lg ${star <= existingRating.rating ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </span>
          ))}
          <span className="text-sm text-gray-600 ml-2">({existingRating.rating}/5)</span>
        </div>
        {existingRating.comment && (
          <p className="text-sm text-gray-600 mt-1">{existingRating.comment}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Submitted {new Date(existingRating.created_at).toLocaleDateString('en-NG')}
        </p>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-green-500 text-lg">✅</span>
          <div>
            <p className="text-sm font-medium text-green-800">Thank you for your rating!</p>
            <p className="text-xs text-green-600">Your feedback helps us improve our service.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Rate Your Delivery</h3>

      {/* Star rating */}
      <div className="flex items-center space-x-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setSelectedRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="text-2xl focus:outline-none transition-colors"
          >
            <span className={
              star <= (hoveredRating || selectedRating)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }>
              ★
            </span>
          </button>
        ))}
        {selectedRating > 0 && (
          <span className="text-sm text-gray-600 ml-2">
            {selectedRating === 1 && 'Poor'}
            {selectedRating === 2 && 'Fair'}
            {selectedRating === 3 && 'Good'}
            {selectedRating === 4 && 'Very Good'}
            {selectedRating === 5 && 'Excellent'}
          </span>
        )}
      </div>

      {/* Comment */}
      <div className="mb-3">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Add a comment (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <p className="text-xs text-gray-500 mt-1">{comment.length}/500</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || selectedRating < 1}
        className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </div>
  );
}
