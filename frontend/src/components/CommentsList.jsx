import { formatDateTime } from '../utils/formatters';

export function CommentsList({ comments = [] }) {
  if (!comments.length) {
    return <div className="empty-box">Комментариев пока нет.</div>;
  }

  return (
    <div className="stack-list">
      {comments.map((comment) => (
        <div className="comment-card" key={comment.id}>
          <div className="comment-card__head">
            <strong>{comment.user_name}</strong>
            <span>{formatDateTime(comment.created_at)}</span>
          </div>
          <p>{comment.body}</p>
        </div>
      ))}
    </div>
  );
}
