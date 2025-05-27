
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Wand2 } from "lucide-react";
import { dynamicTools } from "@/lib/numberPickingAlgos";

export default function NumberPickingToolsListPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            选号工具箱
          </CardTitle>
          <CardDescription>
            探索多种选号工具。点击下方工具查看其详细算法说明，并对照最近10期历史开奖结果分析其动态预测表现。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dynamicTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dynamicTools.map((tool) => (
                <Card key={tool.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground h-24 overflow-auto no-scrollbar"> {/* Fixed height for description, scroll if needed */}
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/number-picking-tools/${tool.id}`}>
                        查看详情与历史表现
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
             <p className="text-muted-foreground text-center py-8">暂无可用选号工具。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
