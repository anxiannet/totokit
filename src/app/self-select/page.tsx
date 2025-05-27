
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SelfSelectPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>自选号码</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">此功能正在开发中。</p>
          <p className="mt-4">在这里，用户将能够手动选择他们的TOTO号码组合。</p>
        </CardContent>
      </Card>
    </div>
  );
}
