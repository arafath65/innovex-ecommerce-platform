import Link from "next/link";

const categories = [
  { name: "Rice Cookers", icon: "🍚" },
  { name: "Cookware", icon: "🍲" },
  { name: "Kitchen Appliances", icon: "🥤" },
  { name: "Storage Solutions", icon: "🪣" },
  { name: "Water Bottles", icon: "🧴" },
  { name: "Buckets & Mugs", icon: "🪣" },
  { name: "Kitchen Tools", icon: "🍴" },
  { name: "Dinnerware", icon: "🍽️" },
];

const products = [
  {
    name: "Panasonic Rice Cooker 1.8L",
    price: 17500,
    rating: "4.8",
    reviews: 128,
    image:
      "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Butterfly Pressure Cooker 5L",
    price: 9850,
    rating: "4.7",
    reviews: 96,
    image:
      "https://images.unsplash.com/photo-1584990347449-a9b7f3f4b5d2?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Electric Blender 1.5L 500W",
    price: 7250,
    rating: "4.6",
    reviews: 64,
    image:
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Non-Stick Cookware Set 7 Pcs",
    price: 12900,
    rating: "4.8",
    reviews: 87,
    image:
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Heavy Duty Bucket 20L",
    price: 1150,
    rating: "4.5",
    reviews: 53,
    image:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Stainless Steel Flask 1.0L",
    price: 1950,
    rating: "4.6",
    reviews: 38,
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=85",
  },
];

const formatPrice = (price: number) =>
  `Rs. ${price.toLocaleString("en-LK")}`;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#171717]">
      {/* Announcement bar */}
      <div className="bg-[#d90016] px-4 py-2 text-xs text-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
          <p className="hidden sm:block">
            🚚 FREE DELIVERY ON ORDERS OVER RS. 5,000
          </p>
          <p className="sm:hidden">
            🚚 Free delivery over Rs. 5,000
          </p>

          <div className="flex gap-5">
            <a href="#about">About Us</a>
            <a href="#contact">Contact Us</a>
            <Link href="/track-order">Track Order</Link>
            <a href="#help">Help</a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-5 px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-5xl font-black leading-none text-[#df0018]">
              S
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-3xl font-black tracking-tight">
                OSCAR
              </span>
              <span className="mt-1 text-center text-sm font-bold tracking-[0.5em] text-[#df0018]">
                TRADING
              </span>
            </span>
          </Link>

          {/* Search */}
          <form
            action="/shop"
            className="order-3 flex w-full overflow-hidden rounded-md border border-gray-300 md:order-none md:max-w-[570px] md:flex-1"
          >
            <input
              name="search"
              type="search"
              placeholder="Search for products..."
              className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
            />

            <select
              name="category"
              aria-label="Search category"
              className="hidden border-l border-gray-200 bg-white px-3 text-sm outline-none sm:block"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              aria-label="Search"
              className="bg-[#df0018] px-5 text-lg text-white transition hover:bg-black"
            >
              ⌕
            </button>
          </form>

          <div className="flex items-center gap-4 text-sm sm:gap-6">
            <a
              href="/account"
              className="hidden items-center gap-2 sm:flex"
            >
              <span className="text-2xl">♙</span>
              <span>
                My Account
                <br />
                <span className="text-gray-500">Login / Register</span>
              </span>
            </a>

            <a
              href="/wishlist"
              aria-label="Wishlist"
              className="text-2xl"
            >
              ♡
            </a>

            <a
              href="/cart"
              className="flex items-center gap-2"
            >
              <span className="text-2xl">🛒</span>
              <span className="hidden sm:inline">Cart</span>
              <span className="rounded-full bg-[#df0018] px-2 py-1 text-xs text-white">
                0
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-[#101010] text-white">
        <div className="mx-auto flex max-w-[1400px] items-stretch px-5">
          <a
            href="#categories"
            className="flex items-center gap-3 bg-[#df0018] px-6 py-4 text-sm font-bold uppercase"
          >
            <span>☰</span>
            <span className="hidden sm:inline">All Categories</span>
            <span className="sm:hidden">Categories</span>
          </a>

          <div className="flex flex-1 items-center justify-around gap-4 overflow-x-auto px-5 text-xs font-semibold uppercase sm:text-sm">
            <Link href="/" className="border-b-2 border-red-600 py-5">
              Home
            </Link>
            <Link href="/shop" className="py-5 hover:text-red-400">
              Shop
            </Link>
            <a href="#categories" className="py-5 hover:text-red-400">
              Categories
            </a>
            <a href="#offers" className="py-5 hover:text-red-400">
              Offers
            </a>
            <a href="#about" className="hidden py-5 hover:text-red-400 md:block">
              About Us
            </a>
            <a href="#contact" className="hidden py-5 hover:text-red-400 md:block">
              Contact Us
            </a>
          </div>
        </div>
      </nav>

      {/* Hero banner */}
      <section className="relative overflow-hidden bg-[#111] text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/20" />

        <div className="relative mx-auto grid min-h-[390px] max-w-[1400px] items-center gap-8 px-6 py-12 md:min-h-[440px] md:grid-cols-[0.8fr_1.2fr] md:px-10">
          <div className="z-10 max-w-lg">
            <p className="font-serif text-4xl italic text-[#ed142a]">
              Premium
            </p>

            <h1 className="mt-1 text-4xl font-black uppercase leading-tight sm:text-5xl md:text-6xl">
              Kitchenware
              <br />
              Collection
            </h1>

            <p className="mt-5 max-w-sm text-base leading-7 text-gray-200">
              Everything you need for a modern and convenient kitchen.
            </p>

            <a
              href="/shop"
              className="mt-7 inline-flex items-center gap-3 rounded-md bg-[#df0018] px-7 py-3 font-bold text-white transition hover:bg-white hover:text-black"
            >
              SHOP NOW <span>→</span>
            </a>
          </div>

          <div className="relative flex min-h-[250px] items-center justify-center md:min-h-[350px]">
            <div className="absolute h-64 w-64 rounded-full bg-red-700/20 blur-3xl" />
            <div className="relative grid grid-cols-3 items-center gap-3 text-center text-6xl sm:text-8xl">
              <span>🍲</span>
              <span className="text-8xl sm:text-9xl">🥘</span>
              <span>🥄</span>
              <span>🍳</span>
              <span>🥣</span>
              <span>🔪</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
          <span className="h-2 w-7 rounded-full bg-red-600" />
          <span className="h-2 w-2 rounded-full bg-white" />
          <span className="h-2 w-2 rounded-full bg-white" />
        </div>
      </section>

      {/* Categories */}
      <section
        id="categories"
        className="mx-auto max-w-[1400px] px-5 py-8 sm:py-10"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase sm:text-2xl">
            Shop by <span className="text-[#df0018]">Category</span>
          </h2>

          <Link href="/categories" className="text-xs hover:text-red-600 sm:text-sm">
            View All Categories →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => (
            <a
              key={category.name}
              href={`/shop?category=${encodeURIComponent(category.name)}`}
              className="group flex flex-col items-center text-center"
            >
              <div className="flex aspect-square w-full max-w-[130px] items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-5xl transition group-hover:border-red-200 group-hover:bg-red-50 group-hover:shadow-md sm:text-6xl">
                {category.icon}
              </div>

              <h3 className="mt-3 text-xs font-semibold sm:text-sm">
                {category.name}
              </h3>
            </a>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-5 py-8 sm:py-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase sm:text-2xl">
              Featured <span className="text-[#df0018]">Products</span>
            </h2>

            <Link href="/shop" className="text-xs hover:text-red-600 sm:text-sm">
              View All Products →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
            {products.map((product) => (
              <article
                key={product.name}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
              >
                <Link href="/shop" className="block">
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="px-3 pt-3">
                    <h3 className="min-h-10 text-xs font-medium leading-5 sm:text-sm">
                      {product.name}
                    </h3>

                    <p className="mt-2 font-bold text-[#df0018]">
                      {formatPrice(product.price)}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="tracking-tight text-[#df0018]">
                        ★★★★★
                      </span>
                      <span className="text-gray-500">
                        ({product.reviews})
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="p-3 pt-2">
                  <button
                    type="button"
                    disabled
                    title="Cart functionality will be implemented next"
                    className="w-full rounded-md bg-[#df0018] px-2 py-2 text-xs font-semibold text-white opacity-90 transition hover:bg-black disabled:cursor-not-allowed sm:text-sm"
                  >
                    🛒 Add to Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional banner */}
      <section
        id="offers"
        className="mx-auto max-w-[1400px] px-5 pb-8"
      >
        <div className="relative flex min-h-[200px] flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#ed0019] to-[#c90015] px-7 py-8 text-white sm:px-10 md:min-h-[230px] md:flex-row md:items-center md:justify-between">
          <div className="relative z-10">
            <p className="text-sm uppercase tracking-wide">
              Special Offer
            </p>

            <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">
              Up to 30% Off
            </h2>

            <p className="mt-2 font-semibold uppercase">
              On selected kitchenware items
            </p>

            <a
              href="/offers"
              className="mt-5 inline-flex rounded bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              SHOP NOW →
            </a>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-5xl sm:text-7xl md:mt-0">
            <span>🥤</span>
            <span>🍲</span>
            <span>🍳</span>
            <span>🍴</span>
          </div>

          <span className="absolute bottom-4 right-5 text-xs font-bold uppercase tracking-widest text-white/70">
            Limited time only
          </span>
        </div>
      </section>

      {/* Service highlights */}
      <section className="mx-auto max-w-[1400px] px-5 py-8">
        <div className="grid grid-cols-2 gap-6 border-y border-gray-100 py-7 lg:grid-cols-4">
          {[
            {
              icon: "🚚",
              title: "Free Delivery",
              text: "On orders over Rs. 5,000",
            },
            {
              icon: "🛡️",
              title: "Secure Payment",
              text: "Your payment is safe with us",
            },
            {
              icon: "🏅",
              title: "Quality Guarantee",
              text: "We select quality products",
            },
            {
              icon: "🎧",
              title: "Customer Support",
              text: "We're here to help you",
            },
          ].map((service) => (
            <div
              key={service.title}
              className="flex items-center gap-3"
            >
              <span className="text-3xl text-[#df0018]">
                {service.icon}
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase sm:text-sm">
                  {service.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {service.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        id="about"
        className="bg-[#101010] text-white"
      >
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-4xl font-black text-[#df0018]">
                S
              </span>
              <span>
                <span className="block text-2xl font-black">OSCAR</span>
                <span className="block text-center text-xs font-bold tracking-[0.4em] text-red-500">
                  TRADING
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-400">
              Your one-stop shop for quality kitchenware and home essentials.
            </p>

            <div className="mt-5 flex gap-3 text-sm">
              <a href="#contact" aria-label="Facebook">ⓕ</a>
              <a href="#contact" aria-label="Instagram">◎</a>
              <a href="#contact" aria-label="YouTube">▶</a>
              <a href="#contact" aria-label="WhatsApp">◉</a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><Link href="/shop" className="hover:text-white">Shop</Link></li>
              <li><Link href="/categories" className="hover:text-white">Categories</Link></li>
              <li><Link href="/offers" className="hover:text-white">Offers</Link></li>
              <li><a href="#about" className="hover:text-white">About Us</a></li>
            </ul>
          </div>

          <div id="help">
            <h3 className="text-sm font-bold uppercase">Customer Service</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-400">
              <li><Link href="/account" className="hover:text-white">My Account</Link></li>
              <li><Link href="/track-order" className="hover:text-white">Track Order</Link></li>
              <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
              <li><Link href="/returns" className="hover:text-white">Returns & Refunds</Link></li>
              <li><Link href="/shipping" className="hover:text-white">Shipping Policy</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase">Categories</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-400">
              {categories.slice(0, 6).map((category) => (
                <li key={category.name}>
                  <a
                    href={`/shop?category=${encodeURIComponent(category.name)}`}
                    className="hover:text-white"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div id="contact">
            <h3 className="text-sm font-bold uppercase">Newsletter</h3>
            <p className="mt-4 text-sm leading-6 text-gray-400">
              Subscribe to get updates on new products and offers.
            </p>

            <form action="#" className="mt-4 space-y-2">
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="w-full rounded bg-white px-3 py-3 text-sm text-black outline-none"
              />
              <button
                type="submit"
                className="w-full rounded bg-[#df0018] px-4 py-3 text-sm font-bold uppercase transition hover:bg-red-700"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} Oscar Trading. All Rights Reserved.</p>
            <p className="font-bold tracking-wide text-white">
              VISA　 Mastercard　 Cash
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
