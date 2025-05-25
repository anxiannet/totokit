"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2, ListChecks, Search, CheckCircle2, XCircle } from "lucide-react";
import type { UserTicket, TotoCombination, HistoricalResult } from "@/lib/types";
import { MOCK_LATEST_RESULT, TOTO_COMBINATION_LENGTH, TOTO_NUMBER_RANGE } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const latestResult: HistoricalResult = MOCK_LATEST_RESULT; // Use mock data for now

interface WinningGroup {
  group: number;
  prize: string;
  matchedNumbers: number;
  matchedAdditional: boolean;
}

// Simplified prize groups for demonstration
const PRIZE_GROUPS = [
  { group: 1, prize: "Group 1 Prize (Jackpot)", match: 6, additional: false },
  { group: 2, prize: "Group 2 Prize", match: 5, additional: true },
  { group: 3, prize: "Group 3 Prize", match: 5, additional: false },
  { group: 4, prize: "Group 4 Prize", match: 4, additional: true },
  { group: 5, prize: "Group 5 Prize", match: 4, additional: false },
  { group: 6, prize: "Group 6 Prize", match: 3, additional: true },
  { group: 7, prize: "Group 7 Prize", match: 3, additional: false },
];

const checkWin = (ticketNumbers: TotoCombination, officialResult: HistoricalResult): WinningGroup | null => {
  const matchedMainNumbers = ticketNumbers.filter(num => officialResult.numbers.includes(num)).length;
  const matchedAdditionalNumber = ticketNumbers.includes(officialResult.additionalNumber);

  for (const prize of PRIZE_GROUPS) {
    if (prize.additional) {
      if (matchedMainNumbers === prize.match && matchedAdditionalNumber) {
        return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: true };
      }
    } else {
      if (matchedMainNumbers === prize.match && (!prize.additional || matchedAdditionalNumber || !officialResult.numbers.some(n => ticketNumbers.includes(n)))) {
         // For Group 3, 5, 7, additional number match is not required.
         // The additional number condition for non-additional prize groups is complex in reality (e.g. for Group 3, matching 5 main numbers means you didn't match the 6th main number but it does not matter if you matched the additional).
         // For simplicity here, if it's not an "additional required" group, we just check main numbers.
        if (prize.group === 3 && matchedMainNumbers === 5) return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: matchedAdditionalNumber };
        if (prize.group === 5 && matchedMainNumbers === 4) return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: matchedAdditionalNumber };
        if (prize.group === 7 && matchedMainNumbers === 3) return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: matchedAdditionalNumber };
      }
    }
  }
  // A specific check for Group 1, which does not care about the additional number.
  if (matchedMainNumbers === 6) return { group: 1, prize: "Group 1 Prize (Jackpot)", matchedNumbers: 6, matchedAdditional: false};

  return null;
};


export function WinChecker() {
  const { toast } = useToast();
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [currentTicketInput, setCurrentTicketInput] = useState<string>("");
  const [checkedTickets, setCheckedTickets] = useState<Array<UserTicket & { win?: WinningGroup | null }>>([]);

  const handleAddTicket = (event?: FormEvent) => {
    event?.preventDefault();
    const numbers = currentTicketInput
      .split(/[,.\s]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n) && n >= TOTO_NUMBER_RANGE.min && n <= TOTO_NUMBER_RANGE.max);

    if (numbers.length !== TOTO_COMBINATION_LENGTH) {
      toast({
        title: "Invalid Ticket",
        description: `Please enter exactly ${TOTO_COMBINATION_LENGTH} numbers between ${TOTO_NUMBER_RANGE.min} and ${TOTO_NUMBER_RANGE.max}.`,
        variant: "destructive",
      });
      return;
    }
    if (new Set(numbers).size !== TOTO_COMBINATION_LENGTH) {
      toast({
        title: "Invalid Ticket",
        description: "Duplicate numbers are not allowed in a ticket.",
        variant: "destructive",
      });
      return;
    }

    setUserTickets([...userTickets, { id: crypto.randomUUID(), numbers }]);
    setCurrentTicketInput("");
  };

  const handleRemoveTicket = (id: string) => {
    setUserTickets(userTickets.filter(t => t.id !== id));
    setCheckedTickets(checkedTickets.filter(t => t.id !== id));
  };

  const handleCheckAllTickets = () => {
    if(userTickets.length === 0) {
      toast({
        title: "No Tickets",
        description: "Please add some tickets first.",
        variant: "default"
      });
      return;
    }
    const results = userTickets.map(ticket => ({
      ...ticket,
      win: checkWin(ticket.numbers, latestResult),
    }));
    setCheckedTickets(results);
    toast({
      title: "Tickets Checked",
      description: `Checked ${results.length} tickets against draw no. ${latestResult.drawNumber}.`,
    });
  };
  
  const getBallColor = (number: number, isWinning: boolean, isAdditional: boolean = false): string => {
    if (!isWinning) return "bg-muted text-muted-foreground"; // Default for non-winning numbers
    if (isAdditional) return "bg-destructive text-white"; // Crimson Red for additional number
    
    // Winning main numbers
    if (number >= 1 && number <= 9) return "bg-red-500 text-white";
    if (number >= 10 && number <= 19) return "bg-blue-500 text-white";
    if (number >= 20 && number <= 29) return "bg-green-500 text-white";
    if (number >= 30 && number <= 39) return "bg-yellow-500 text-black";
    if (number >= 40 && number <= 49) return "bg-purple-500 text-white";
    return "bg-gray-500 text-white";
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          Check Your Tickets
        </CardTitle>
        <CardDescription>
          Enter your TOTO ticket numbers and check them against the latest official results.
          Numbers are checked against draw no. {latestResult.drawNumber}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAddTicket} className="flex items-end gap-2">
          <div className="flex-grow">
            <Label htmlFor="ticketInput">Enter Ticket Numbers (comma-separated)</Label>
            <Input
              id="ticketInput"
              value={currentTicketInput}
              onChange={(e) => setCurrentTicketInput(e.target.value)}
              placeholder="e.g., 1, 2, 3, 4, 5, 6"
            />
          </div>
          <Button type="submit" variant="outline" size="icon" aria-label="Add ticket">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </form>

        {userTickets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Your Tickets:</h3>
            <ScrollArea className="h-[150px] rounded-md border p-2">
              <ul className="space-y-2">
                {userTickets.map((ticket) => (
                  <li key={ticket.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="font-mono text-sm">{ticket.numbers.join(", ")}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTicket(ticket.id)}
                      aria-label="Remove ticket"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        {checkedTickets.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Checked Results:</h3>
            <ScrollArea className="h-[200px] rounded-md border">
              <ul className="p-2 space-y-3">
                {checkedTickets.map((ticket) => (
                  <li key={`checked-${ticket.id}`} className={`p-3 rounded-lg shadow-sm border ${ticket.win ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex space-x-1">
                        {ticket.numbers.map(num => (
                           <span
                            key={num}
                            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                              ${getBallColor(num, latestResult.numbers.includes(num) || num === latestResult.additionalNumber, num === latestResult.additionalNumber && ticket.numbers.includes(latestResult.additionalNumber))}`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                      {ticket.win ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Winner!
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-4 w-4" /> Not a Winner
                        </Badge>
                      )}
                    </div>
                    {ticket.win && (
                      <p className="text-sm font-medium text-green-700">
                        Matched {ticket.win.matchedNumbers} numbers {ticket.win.matchedAdditional ? " + Additional" : ""}.
                        Prize: {ticket.win.prize} (Group {ticket.win.group})
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleCheckAllTickets} className="w-full" disabled={userTickets.length === 0}>
          <Search className="mr-2 h-4 w-4" /> Check All Tickets
        </Button>
      </CardFooter>
    </Card>
  );
}
