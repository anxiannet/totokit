// src/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { Ticket, Menu as MenuIcon, Gift, Sparkles, Layers, Briefcase, LogIn, Home, ArrowLeft, ListOrdered, UserCircle, LogOut, UserPlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { auth } from '@/lib/firebase'; // Import auth for signOut
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Import useRouter

interface HeaderProps {
  // No longer directly handling view switching from main page
}

export function Header({}: HeaderProps) {
  const { user } = useAuth(); // Get user from AuthContext
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "已退出登录" });
      router.push('/'); // Redirect to home after logout
    } catch (error: any) {
      toast({ title: "退出失败", description: error.message, variant: "destructive" });
    }
  };

  const menuItems = [
    { label: "首页", icon: Home, href: "/" },
    { label: "开奖查询", icon: Gift, href: "/historical-results" },
    { label: "数据分析", icon: ListOrdered, href: "/analytics" },
    { label: "选号工具", icon: Sparkles, href: "/number-picking-tools" },
    { label: "覆盖选号", icon: Layers, action: () => console.log("覆盖选号 clicked") },
    { label: "我的工具箱", icon: Briefcase, action: () => console.log("我的工具箱 clicked") },
  ];

  const authMenuItem = user
    ? { label: "退出登录", icon: LogOut, action: handleLogout }
    : { label: "登录 / 注册", icon: LogIn, href: "/auth" };


  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight">
            TOTOKIT
          </h1>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="主菜单">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-card text-card-foreground">
            <SheetHeader className="mb-6 sr-only">
              <SheetTitle className="sr-only">主菜单</SheetTitle>
              <SheetDescription className="sr-only">
                选择一个选项以继续。
              </SheetDescription>
            </SheetHeader>
             {user && (
              <div className="p-4 border-b border-border mb-2">
                <div className="flex items-center gap-3">
                  <UserCircle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.email || "用户"}
                    </p>
                     {/* You can add more user details here if available */}
                  </div>
                </div>
              </div>
            )}
            <nav className="flex flex-col space-y-1">
              {menuItems.map((item) => (
                <SheetClose asChild key={item.label}>
                  {item.href ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                      asChild
                    >
                      <Link href={item.href}>
                        <item.icon className="mr-3 h-5 w-5 text-primary" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={item.action}
                    >
                      <item.icon className="mr-3 h-5 w-5 text-primary" />
                      <span>{item.label}</span>
                    </Button>
                  )}
                </SheetClose>
              ))}
              <Separator className="my-2" />
              <SheetClose asChild>
                {authMenuItem.href ? (
                   <Button
                    variant="ghost"
                    className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                    asChild
                  >
                    <Link href={authMenuItem.href}>
                      <authMenuItem.icon className="mr-3 h-5 w-5 text-primary" />
                      <span>{authMenuItem.label}</span>
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={authMenuItem.action}
                  >
                    <authMenuItem.icon className="mr-3 h-5 w-5 text-primary" />
                    <span>{authMenuItem.label}</span>
                  </Button>
                )}
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
