import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startDeepLinkListener } from '../lib/deepLinks';

/** Lắng nghe ourmemory:// khi mở từ widget (Capacitor iOS). */
export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => startDeepLinkListener(navigate), [navigate]);

  return null;
}
