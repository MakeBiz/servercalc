import CheapLanding, { cheapMeta } from '@/components/CheapLanding';
import { cheapPage } from '@/lib/cheap-pages';

const c = cheapPage('obzor');
export const metadata = cheapMeta(c, '/deshevye-vps');

export default function CheapHub() {
  return <CheapLanding c={c} path="/deshevye-vps" />;
}
