import Head from 'next/head';
import QiblaPage from '../sections/QiblaPage';

export default function QiblaStandalone() {
  return (
    <>
      <Head>
        <title>اتجاه القبلة - هُدَى</title>
        <meta name="description" content="حدد اتجاه القبلة إلى الكعبة المشرفة ببوصلة تفاعلية من موقعك" />
      </Head>
      <QiblaPage effectivePage="qibla" />
    </>
  );
}
