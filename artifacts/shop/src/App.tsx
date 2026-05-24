import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-react";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSyncUser } from "@workspace/api-client-react";

import { ClerkHeaderInjector } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { ShopHome } from "@/pages/ShopHome";
import { ProductList } from "@/pages/ProductList";
import { ProductDetail } from "@/pages/ProductDetail";
import { Cart } from "@/pages/Cart";
import { Checkout } from "@/pages/Checkout";
import { Orders } from "@/pages/Orders";
import { OrderDetail } from "@/pages/OrderDetail";
import { Wishlist } from "@/pages/Wishlist";
import { Profile } from "@/pages/Profile";
import { SellerDashboard } from "@/pages/SellerDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorPrimary: "hsl(28 90% 55%)",
    colorBackground: "hsl(0 0% 100%)",
  }
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function UserSync() {
  const { user, isLoaded } = useUser();
  const syncUser = useSyncUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || hasSynced.current) return;
    syncUser.mutate({
      data: {
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? user.username ?? "User",
        avatarUrl: user.imageUrl,
      }
    });
    hasSynced.current = true;
  }, [user?.id, isLoaded]);

  return null;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><Redirect to="/" /></SignedOut>
    </>
  );
}

function HomePage() {
  return (
    <>
      <SignedIn>
        <Redirect to="/shop" />
      </SignedIn>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-indigo-50">
          <div className="text-center space-y-6 max-w-lg px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-2 shadow-lg shadow-primary/30">
              <span className="text-white text-4xl font-black">S</span>
            </div>
            <h1 className="text-5xl font-black text-foreground tracking-tight">ShopWave</h1>
            <p className="text-slate-500 text-lg">
              India's most trusted marketplace — millions of products, delivered fast.
            </p>
            <div className="flex gap-4 justify-center mt-8">
              <Link href="/sign-in" className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/30">
                Sign In
              </Link>
              <Link href="/sign-up" className="px-8 py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 transition-colors">
                Get Started
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 mt-10 text-sm text-slate-400">
              <div className="text-center"><div className="font-bold text-foreground text-xl">13+</div><div>Products</div></div>
              <div className="text-center"><div className="font-bold text-foreground text-xl">6</div><div>Categories</div></div>
              <div className="text-center"><div className="font-bold text-foreground text-xl">Free</div><div>Delivery above ₹499</div></div>
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      <Route path="/shop">
        <AuthGuard><MainLayout><ShopHome /></MainLayout></AuthGuard>
      </Route>
      <Route path="/products/:id">
        <AuthGuard><MainLayout><ProductDetail /></MainLayout></AuthGuard>
      </Route>
      <Route path="/products">
        <AuthGuard><MainLayout><ProductList /></MainLayout></AuthGuard>
      </Route>
      <Route path="/cart">
        <AuthGuard><MainLayout><Cart /></MainLayout></AuthGuard>
      </Route>
      <Route path="/checkout">
        <AuthGuard><MainLayout><Checkout /></MainLayout></AuthGuard>
      </Route>
      <Route path="/orders/:id">
        <AuthGuard><MainLayout><OrderDetail /></MainLayout></AuthGuard>
      </Route>
      <Route path="/orders">
        <AuthGuard><MainLayout><Orders /></MainLayout></AuthGuard>
      </Route>
      <Route path="/wishlist">
        <AuthGuard><MainLayout><Wishlist /></MainLayout></AuthGuard>
      </Route>
      <Route path="/profile">
        <AuthGuard><MainLayout><Profile /></MainLayout></AuthGuard>
      </Route>
      <Route path="/seller">
        <AuthGuard><MainLayout><SellerDashboard /></MainLayout></AuthGuard>
      </Route>
      <Route path="/admin">
        <AuthGuard><MainLayout><AdminDashboard /></MainLayout></AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={basePath || "/"}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <ClerkQueryClientCacheInvalidator />
            <ClerkHeaderInjector />
            <SignedIn><UserSync /></SignedIn>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
