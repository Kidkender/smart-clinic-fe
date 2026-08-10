import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

interface ChatHeaderIconProps {
  unreadTotal: number;
}

export default function ChatHeaderIcon({ unreadTotal }: ChatHeaderIconProps) {
  return (
    <Link
      to="/chat"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#5d7285] no-underline hover:bg-[#eef2f6] hover:text-[#274760]"
      aria-label="Trò chuyện"
      title="Trò chuyện"
    >
      <Icon icon="fa6-solid:comments" className="text-base" />
      {unreadTotal > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc3545] px-1 text-[10px] font-bold text-white">
          {unreadTotal > 9 ? '9+' : unreadTotal}
        </span>
      )}
    </Link>
  );
}
