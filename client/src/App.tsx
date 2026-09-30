import { Router as WouterRouter, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import FloatingCTAs from "@/components/floating-ctas";
import Home from "@/pages/home";
import About from "@/pages/about";
import OurWork from "@/pages/our-work";
import GetInvolved from "@/pages/get-involved";
import Stories from "@/pages/stories";
import Contact from "@/pages/contact";
import Blog from "@/pages/blog";
import BlogDetail from "@/pages/blog-detail";
import BlogSubmit from "@/pages/blog-submit";
import AdminBlogs from "@/pages/admin-blogs";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <WouterRouter base="/ImpactRising">
      <div className="min-h-screen bg-background">
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/our-work" component={OurWork} />
        <Route path="/get-involved" component={GetInvolved} />
        <Route path="/stories" component={Stories} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogDetail} />
        <Route path="/blog/submit" component={BlogSubmit} />
        <Route path="/admin/blogs" component={AdminBlogs} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
      </Switch>
      <Footer />
      <FloatingCTAs />
      </div>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
