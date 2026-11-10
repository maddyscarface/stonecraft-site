import Link from "next/link";
export default function NotFound() {
  return <section className="bg-cream py-24"><div className="container-sc text-center"><h1 className="font-serif text-4xl">Page not found</h1><p className="mt-3">The page you're looking for doesn't exist.</p><Link href="/" className="btn btn-hunter mt-6">Back home</Link></div></section>;
}
