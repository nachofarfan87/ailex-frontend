import './globals.css';
import Sidebar from './components/Sidebar';

export const metadata = {
  title: 'AILEX | AI juridica profesional',
  description:
    'AILEX centraliza chat, corpus, plantillas y configuracion para practica juridica profesional.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
