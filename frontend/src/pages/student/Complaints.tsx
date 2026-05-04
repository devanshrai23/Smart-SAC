import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast as sonner } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, PlusCircle, AlertTriangle } from "lucide-react";

// Define types for our data
interface ApiEquipment {
  id: string;
  name: string;
}
interface DashboardData {
  equipment: ApiEquipment[];
}

const Complaints = () => {
  // State for Report Broken
  const [heading, setHeading] = useState("");
  const [content, setContent] = useState("");
  const [equipmentId, setEquipmentId] = useState("");

  // State for Request New
  const [newGame, setNewGame] = useState("");
  const [newEquipment, setNewEquipment] = useState("");
  const [newHeading, setNewHeading] = useState("");
  const [newContent, setNewContent] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { wrapApiCall, user } = useAuth();

  // 1️⃣ Fetch equipment list for dropdown
  const { data: equipmentData, isLoading: isLoadingEquipment } = useQuery<DashboardData>({
    queryKey: ["studentDashboard"],
    queryFn: () => wrapApiCall(() => api.get("/users/dashboard")),
    enabled: !!user, // Only fetch if logged in
  });

  // 2️⃣ Create ticket mutation (Report Broken)
  const createTicketMutation = useMutation({
    mutationFn: () => {
      return wrapApiCall(() =>
        api.post("/users/create-ticket", {
          heading,
          content,
          equipmentId,
        })
      );
    },
    onSuccess: () => {
      sonner.success("Ticket submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      navigate("/student/dashboard");
    },
    onError: (error: any) => {
      console.error("Failed to submit ticket:", error);
      sonner.error("Failed to submit ticket. Please try again.");
    },
  });

  // 3️⃣ Create request new equipment mutation
  const requestNewMutation = useMutation({
    mutationFn: () => {
      return wrapApiCall(() =>
        api.post("/users/request-new-equipment", {
          game: newGame,
          equipment: newEquipment,
          heading: newHeading,
          details: newContent,
        })
      );
    },
    onSuccess: () => {
      sonner.success("New equipment request submitted successfully!");
      navigate("/student/dashboard");
    },
    onError: (error: any) => {
      console.error("Failed to submit request:", error);
      sonner.error("Failed to submit request. Please try again.");
    },
  });

  // 4️⃣ Handle form submission for Report Broken
  const handleBrokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heading || !content || !equipmentId) {
      sonner.error("Please fill out all fields before submitting.");
      return;
    }
    createTicketMutation.mutate();
  };

  // 5️⃣ Handle form submission for Request New
  const handleRequestNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame || !newEquipment || !newHeading || !newContent) {
      sonner.error("Please fill out all fields before submitting.");
      return;
    }
    requestNewMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          
          <Tabs defaultValue="report" className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="report" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Report Issue
                </TabsTrigger>
                <TabsTrigger value="request" className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> Request New
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="report">
              <Card className="border-2 shadow-md hover:shadow-lg transition-all animate-scale-in">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Ticket className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="mt-4 text-2xl font-semibold">Report Broken Equipment</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Found an issue with existing equipment? Let us know.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleBrokenSubmit} className="space-y-6">
                    {/* Equipment Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="equipment">Equipment</Label>
                      <Select value={equipmentId} onValueChange={setEquipmentId}>
                        <SelectTrigger id="equipment">
                          <SelectValue placeholder="Select an equipment" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingEquipment ? (
                            <SelectItem value="loading" disabled>
                              Loading equipment...
                            </SelectItem>
                          ) : (
                            equipmentData?.equipment.map((item) => (
                              <SelectItem key={item.id} value={item.id} className="capitalize">
                                {item.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Heading Input */}
                    <div className="space-y-2">
                      <Label htmlFor="heading">Issue / Heading</Label>
                      <Input
                        id="heading"
                        value={heading}
                        onChange={(e) => setHeading(e.target.value)}
                        placeholder="e.g. Bat is cracked, Snooker cue tip broken"
                      />
                    </div>

                    {/* Details Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="content">Details</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Please describe the problem in detail..."
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full bg-gradient-primary"
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="request">
              <Card className="border-2 shadow-md hover:shadow-lg transition-all animate-scale-in">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                    <PlusCircle className="w-8 h-8 text-success" />
                  </div>
                  <CardTitle className="mt-4 text-2xl font-semibold">Request New Equipment</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Equipment not available? Request it from the administration.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleRequestNewSubmit} className="space-y-6">
                    {/* Game Input */}
                    <div className="space-y-2">
                      <Label htmlFor="game">Game / Sport</Label>
                      <Input
                        id="game"
                        value={newGame}
                        onChange={(e) => setNewGame(e.target.value)}
                        placeholder="e.g. Cricket, Basketball"
                      />
                    </div>

                    {/* Equipment Input */}
                    <div className="space-y-2">
                      <Label htmlFor="newEquipment">Equipment Name</Label>
                      <Input
                        id="newEquipment"
                        value={newEquipment}
                        onChange={(e) => setNewEquipment(e.target.value)}
                        placeholder="e.g. Leather Ball, Net"
                      />
                    </div>

                    {/* Heading Input */}
                    <div className="space-y-2">
                      <Label htmlFor="newHeading">Reason / Heading</Label>
                      <Input
                        id="newHeading"
                        value={newHeading}
                        onChange={(e) => setNewHeading(e.target.value)}
                        placeholder="e.g. Need more balls for the tournament"
                      />
                    </div>

                    {/* Details Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="newContent">Details</Label>
                      <Textarea
                        id="newContent"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Please describe why this equipment is needed..."
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full bg-gradient-primary"
                      disabled={requestNewMutation.isPending}
                    >
                      {requestNewMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  );
};

export default Complaints;
