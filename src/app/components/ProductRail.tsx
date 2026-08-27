import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "./ui/carousel";
import { ProductCard, type ShopProduct } from "./ProductCard";

interface ProductRailProps {
  id?: string;
  title: string;
  products: ShopProduct[];
}

export function ProductRail({ id, title, products }: ProductRailProps) {
  if (products.length === 0) return null;

  return (
    <section id={id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 scroll-mt-20">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>

      <Carousel opts={{ align: "start" }} className="px-1">
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem key={product.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4">
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-3 sm:-left-4" style={{ backgroundColor: 'var(--color-product-card)' }} />
        <CarouselNext className="-right-3 sm:-right-4" style={{ backgroundColor: 'var(--color-product-card)' }} />
      </Carousel>
    </section>
  );
}
