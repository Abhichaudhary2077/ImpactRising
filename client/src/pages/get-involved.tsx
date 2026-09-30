import { useState } from "react";
import { Heart, Users, Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertVolunteerSchema, insertDonationSchema } from "@shared/schema";
import { z } from "zod";

const volunteerFormSchema = insertVolunteerSchema.extend({
  areaOfInterest: z.string().min(1, "Please select an area of interest"),
  skills: z.string().optional(),
});

const donationFormSchema = insertDonationSchema.extend({
  amount: z.number().min(1, "Amount must be greater than 0"),
  donorName: z.string().optional(),
  donorEmail: z.string().email("Please enter a valid email").optional(),
});

type VolunteerFormData = z.infer<typeof volunteerFormSchema>;
type DonationFormData = z.infer<typeof donationFormSchema>;

export default function GetInvolved() {
  const [donationAmount, setDonationAmount] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const UPI_ID = "YOUR_UPI_ID@UPI";
  const { toast } = useToast();

  const volunteerForm = useForm<VolunteerFormData>({
    resolver: zodResolver(volunteerFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      areaOfInterest: "",
      skills: "",
    },
  });

  const volunteerMutation = useMutation({
    mutationFn: async (data: VolunteerFormData) => {
      const response = await apiRequest("POST", "/api/volunteers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest in volunteering. We'll contact you soon.",
      });
      volunteerForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const donationMutation = useMutation({
    mutationFn: async (data: DonationFormData) => {
      const response = await apiRequest("POST", "/api/donations", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isMonthly ? "Monthly donation recorded" : "Donation recorded",
        description: isMonthly
          ? "Please complete your recurring UPI mandate separately."
          : "Use the UPI app or QR code to complete your payment.",
      });
      setDonationAmount("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record donation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createUpiLink = (amount: number) =>
    `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=Impact%20Rising&am=${amount}&cu=INR`;

  const handleDonation = (amount: number) => {
    donationMutation.mutate({
      amount,
      isMonthly,
      donorName: undefined,
      donorEmail: undefined,
    });

    if (!isMonthly) {
      window.location.href = createUpiLink(amount);
    }
  };

  const handleCustomDonation = () => {
    const amount = parseInt(donationAmount, 10);
    if (amount > 0) handleDonation(amount);
  };

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      toast({
        title: "UPI ID copied",
        description: "Paste it into your UPI app to complete the payment.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the UPI ID manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="pt-16 min-h-screen" data-testid="get-involved-page">
      {/* Hero Section */}
      <section className="py-20 bg-muted" data-testid="involvement-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-6" data-testid="involvement-title">
            <span className="font-script text-primary">Join</span> Our Mission
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="involvement-subtitle">
            Join us in creating lasting change. Every contribution, big or small, 
            makes a difference in someone's life.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-card" data-testid="involvement-content">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Donation Section */}
            <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-8 border border-secondary/20" data-testid="donation-section">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4" data-testid="donation-title">
                  Make a Donation
                </h3>
                <p className="text-muted-foreground mb-6" data-testid="donation-description">
                  Support Impact Rising directly through UPI. Choose an amount, then pay using your UPI app or scan the QR code.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" className="p-3 h-auto flex flex-col hover:border-secondary hover:bg-secondary/5 donate-button" onClick={() => handleDonation(500)} disabled={donationMutation.isPending} data-testid="donation-button-500">
                    <div className="font-semibold">₹500</div>
                    <div className="text-xs text-muted-foreground">Books</div>
                  </Button>
                  <Button variant="outline" className="p-3 h-auto flex flex-col hover:border-secondary hover:bg-secondary/5 donate-button" onClick={() => handleDonation(2000)} disabled={donationMutation.isPending} data-testid="donation-button-2000">
                    <div className="font-semibold">₹2,000</div>
                    <div className="text-xs text-muted-foreground">Skills training</div>
                  </Button>
                  <Button variant="outline" className="p-3 h-auto flex flex-col hover:border-secondary hover:bg-secondary/5 donate-button" onClick={() => handleDonation(5000)} disabled={donationMutation.isPending} data-testid="donation-button-5000">
                    <div className="font-semibold">₹5,000</div>
                    <div className="text-xs text-muted-foreground">School supplies</div>
                  </Button>
                </div>

                <div className="flex items-center space-x-3">
                  <Input type="number" min="1" placeholder="Custom amount" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} className="flex-1" data-testid="input-custom-amount" />
                  <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleCustomDonation} disabled={donationMutation.isPending} data-testid="button-custom-donate">
                    {donationMutation.isPending ? "Processing..." : "Donate"}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="monthly" checked={isMonthly} onCheckedChange={(checked) => setIsMonthly(checked === true)} data-testid="checkbox-monthly-donation" />
                  <label htmlFor="monthly" className="text-sm text-muted-foreground">
                    I want to donate monthly
                  </label>
                </div>

                <div className="rounded-xl border border-border bg-background/70 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {isMonthly ? "Monthly donation" : "One-time UPI donation"}
                  </div>

                  {isMonthly ? (
                    <p className="text-sm text-muted-foreground">
                      Monthly donations require a recurring UPI mandate. A static QR cannot create an automatic monthly mandate. Please contact Impact Rising for recurring-donation setup.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <span className="font-mono text-sm break-all">{UPI_ID}</span>
                        <Button type="button" variant="outline" size="icon" onClick={copyUpiId} title="Copy UPI ID">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-64 h-64 rounded-lg border bg-white p-2 flex items-center justify-center">
                          <img src="/donation-qr.png" alt="Impact Rising UPI QR code" className="w-full h-full object-contain" />
                          <QrCode className="hidden" />
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Add your real <code>donation-qr.png</code> and replace <code>YOUR_UPI_ID@UPI</code> after pulling this change.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground" data-testid="donation-footer">
                One-time donations are paid directly to the configured NGO UPI account.
              </div>
            </div>

            {/* Volunteer Section */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 border border-primary/20" data-testid="volunteer-section">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4" data-testid="volunteer-title">
                  Become a Volunteer
                </h3>
                <p className="text-muted-foreground mb-6" data-testid="volunteer-description">
                  Share your skills, time, and passion to directly impact lives in your community.
                </p>
              </div>
              
              <form onSubmit={volunteerForm.handleSubmit(onVolunteerSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      placeholder="Full Name"
                      {...volunteerForm.register("fullName")}
                      data-testid="input-volunteer-name"
                    />
                    {volunteerForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive mt-1" data-testid="error-volunteer-name">
                        {volunteerForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email Address"
                      {...volunteerForm.register("email")}
                      data-testid="input-volunteer-email"
                    />
                    {volunteerForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1" data-testid="error-volunteer-email">
                        {volunteerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    {...volunteerForm.register("phone")}
                    data-testid="input-volunteer-phone"
                  />
                  {volunteerForm.formState.errors.phone && (
                    <p className="text-sm text-destructive mt-1" data-testid="error-volunteer-phone">
                      {volunteerForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Select onValueChange={(value) => volunteerForm.setValue("areaOfInterest", value)}>
                    <SelectTrigger data-testid="select-volunteer-interest">
                      <SelectValue placeholder="Choose your area of interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="education">Education & Teaching</SelectItem>
                      <SelectItem value="women-empowerment">Women Empowerment</SelectItem>
                      <SelectItem value="spiritual-programs">Spiritual Programs</SelectItem>
                      <SelectItem value="environmental">Environmental Activities</SelectItem>
                      <SelectItem value="administrative">Administrative Support</SelectItem>
                    </SelectContent>
                  </Select>
                  {volunteerForm.formState.errors.areaOfInterest && (
                    <p className="text-sm text-destructive mt-1" data-testid="error-volunteer-interest">
                      {volunteerForm.formState.errors.areaOfInterest.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Textarea
                    placeholder="Tell us about your skills and availability"
                    rows={3}
                    {...volunteerForm.register("skills")}
                    data-testid="textarea-volunteer-skills"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={volunteerMutation.isPending}
                  data-testid="button-volunteer-submit"
                >
                  {volunteerMutation.isPending ? "Submitting..." : "Join as Volunteer"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
