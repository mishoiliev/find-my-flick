import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImdb } from '@fortawesome/free-brands-svg-icons';

export default function IMDBIcon({ className = '' }: { className?: string }) {
  return (
    <FontAwesomeIcon
      icon={faImdb}
      className={`text-[#F5C518] ${className}`}
      aria-label="IMDB"
    />
  );
}
