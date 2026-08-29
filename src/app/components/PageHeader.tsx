import { ImageWithFallback } from "./figma/ImageWithFallback";

export function PageHeader({
  title,
  subtitle,
  image,
  tint,
}: {
  title: string;
  subtitle: string;
  image: string;
  tint: string;
}) {
  return (
    <div className="relative py-12 overflow-hidden">
      <ImageWithFallback src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ backgroundColor: tint }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-white opacity-90">{subtitle}</p>
      </div>
    </div>
  );
}
