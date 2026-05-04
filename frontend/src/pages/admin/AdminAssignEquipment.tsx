import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom"; // ✅ Added import

const AdminAssignEquipment = () => {
  const { wrapApiCall } = useAuth();
  const navigate = useNavigate(); // ✅ Added navigate hook

  const [equipment, setEquipment] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [showInUseModal, setShowInUseModal] = useState(false);
  const [rollNo, setRollNo] = useState("");
  const [duration, setDuration] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [isUserRegistered, setIsUserRegistered] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyRollNumber = async (silent = false) => {
    if (!rollNo) return;
    setIsVerifying(true);
    try {
      const res = await wrapApiCall(() => api.get(`/admin/get-user-by-roll/${rollNo}`));
      if (res?.found) {
        setIsUserRegistered(true);
        setGuestName(res.user.fullname);
        setGuestPhone(res.user.phone_number);
        if (!silent) toast.success(`Found user: ${res.user.fullname}`);
      } else {
        setIsUserRegistered(false);
        setGuestName("");
        setGuestPhone("");
        if (!silent) toast.info("Unregistered User. Please enter name and phone number.");
      }
    } catch (error) {
      console.error("Error verifying roll number:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rollNo && rollNo.length >= 3) {
        verifyRollNumber(true);
      } else if (!rollNo) {
        setIsUserRegistered(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [rollNo]);

  // Fetch equipment safely
  useEffect(() => {
    const fetchData = async () => {
      try {
        const equipmentRes = await wrapApiCall(() => api.get("/admin/get-equipment")).catch(() => []);
        setEquipment(Array.isArray(equipmentRes) ? equipmentRes : []);
      } catch (err) {
        console.error("Error fetching equipment data:", err);
        setEquipment([]);
        toast.error("Failed to load equipment");
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [wrapApiCall]);

  // Handle status change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    if (status === "in-use") {
      setShowInUseModal(true);
    } else {
      updateEquipmentStatus(status);
    }
  };

  // Update equipment status
  const updateEquipmentStatus = async (status: string, roll_no?: string, durationValue?: string, guestNameValue?: string, guestPhoneValue?: string) => {
    if (!selectedEquipment) {
      toast.error("Please select equipment first");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        status,
        equipmentid: selectedEquipment,
      };

      if (status === "in-use") {
        if (!roll_no || !durationValue) {
          toast.error("Roll number and duration are required for in-use status");
          return;
        }
        payload.roll_no = roll_no;
        payload.duration = durationValue;
        payload.guestName = guestNameValue;
        payload.guestPhone = guestPhoneValue;
      }

      console.log("Sending payload:", payload);
      const response = await wrapApiCall(() => api.post("/admin/update-equipment", payload));
      console.log("Update response:", response);

      toast.success(`Equipment status updated to ${status}`);

      const equipmentRes = await wrapApiCall(() => api.get("/admin/get-equipment"));
      setEquipment(Array.isArray(equipmentRes) ? equipmentRes : []);

      setSelectedEquipment("");
      setSelectedStatus("");
      setRollNo("");
      setDuration("");
      setGuestName("");
      setGuestPhone("");
      setIsUserRegistered(null);
      setShowInUseModal(false);
    } catch (err: any) {
      console.error("Update equipment error:", err);
      const errorMessage = err?.response?.data?.message || err.message || "Failed to update equipment status";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInUseSubmit = () => {
    if (!rollNo.trim() || !duration.trim()) {
      toast.error("Please fill in both roll number and duration");
      return;
    }
    if (isUserRegistered === false && (!guestName.trim() || !guestPhone.trim())) {
      toast.error("Please provide name and phone for unregistered users");
      return;
    }
    updateEquipmentStatus("in-use", rollNo.trim(), duration.trim(), guestName.trim(), guestPhone.trim());
  };

  const handleUnassign = async (equipmentId: string) => {
    try {
      setLoading(true);
      const payload = { status: "available", equipmentid: equipmentId };
      console.log("Unassign payload:", payload);
      await wrapApiCall(() => api.post("/admin/update-equipment", payload));
      toast.success("Equipment unassigned successfully");

      const equipmentRes = await wrapApiCall(() => api.get("/admin/get-equipment"));
      setEquipment(Array.isArray(equipmentRes) ? equipmentRes : []);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.message || err.message || "Failed to unassign equipment";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading equipment data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4 md:px-6">

        {/* ✅ Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to Dashboard
          </Button>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center md:text-left">
              Manage Equipment Status
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Equipment selection */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-muted-foreground">
                  Select Equipment
                </label>
                <Select 
                  value={selectedEquipment} 
                  onValueChange={(value) => {
                    setSelectedEquipment(value);
                    setSelectedStatus("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {(equipment ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} - ({e.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status selection */}
              {selectedEquipment && (
                <div>
                  <label className="block mb-2 text-sm font-semibold text-muted-foreground">
                    Set Status
                  </label>
                  <Select 
                    value={selectedStatus} 
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in-use">In Use</SelectItem>
                      <SelectItem value="broken">Broken</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedEquipment && selectedStatus && selectedStatus !== "in-use" && (
              <Button
                className="w-full bg-gradient-primary text-white"
                onClick={() => updateEquipmentStatus(selectedStatus)}
                disabled={loading}
              >
                {loading ? "Updating..." : `Set Status to ${selectedStatus}`}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* In-Use Modal */}
        <Dialog open={showInUseModal} onOpenChange={setShowInUseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Equipment for Use</DialogTitle>
              <DialogDescription>
                Please provide the roll number and duration for equipment assignment.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="rollNo">Roll Number *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="rollNo"
                    type="text"
                    value={rollNo}
                    onChange={(e) => {
                      setRollNo(e.target.value);
                      setIsUserRegistered(null);
                    }}
                    placeholder="Enter roll number"
                    required
                  />
                  <Button type="button" onClick={verifyRollNumber} disabled={isVerifying || !rollNo}>
                    {isVerifying ? "..." : "Verify"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="guestName">Name *</Label>
                <Input
                  id="guestName"
                  placeholder="e.g., John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="guestPhone">Phone Number *</Label>
                <Input
                  id="guestPhone"
                  placeholder="e.g., +91 9876543210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 2 hours, 1 day, etc."
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowInUseModal(false);
                  setRollNo("");
                  setDuration("");
                  setGuestName("");
                  setGuestPhone("");
                  setIsUserRegistered(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInUseSubmit}
                disabled={loading || !rollNo.trim() || !duration.trim()}
              >
                {loading ? "Assigning..." : "Assign Equipment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Current Assignments */}
        <div className="mt-10">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-center md:text-left">
                Current Assignments
              </CardTitle>
            </CardHeader>

            <CardContent>
              {(equipment ?? []).filter((e) => e.status === "in-use" || e.status === "in_use").length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  No active assignments
                </p>
              ) : (
                <div className="space-y-3">
                  {(equipment ?? [])
                    .filter((e) => e.status === "in-use" || e.status === "in_use")
                    .map((e) => (
                      <div
                        key={e.id}
                        className="flex justify-between items-center border p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{e.name}</p>
                          <p className="text-sm font-medium text-foreground mb-1">
                            {e.user?.fullname || e.guestName || "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Roll No: {e.user?.roll_no || e.roll_no || "Unknown"}
                            {(e.user?.phone_number || e.guestPhone) && ` • ${e.user?.phone_number || e.guestPhone}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {e.duration || "Not specified"}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => handleUnassign(e.id)}
                          disabled={loading}
                        >
                          Unassign
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignEquipment;
