
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session || session.storeSlug !== "oscar-trading") {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Innovex Admin
          </h1>
          <p className="mt-1 text-gray-500">
            Oscar Trading · Store Management
          </p>
        </header>

        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h2>
          <p className="mt-2 text-gray-600">
            Welcome back, {session.name}.
          </p>
          <p className="text-sm text-gray-500">
            Signed in as {session.role}
          </p>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Products",
              description: "Manage products and availability.",
            },
            {
              title: "Orders",
              description: "Review and manage customer orders.",
            },
            {
              title: "Store Settings",
              description: "Manage your store configuration.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <h3 className="font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {item.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}