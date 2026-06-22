import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/use-profile";

export function useKycGuard() {
  const { profile } = useProfile();
  const [isKycDialogOpen, setIsKycDialogOpen] = useState(false);

  const checkKyc = (onSuccess: () => void) => {
    if (profile?.kyc_status === "verified") {
      onSuccess();
    } else {
      setIsKycDialogOpen(true);
    }
  };

  const KycGuardDialog = () => {
    const { t } = useTranslation();
    return (
      <AlertDialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
        <AlertDialogContent className="border-border/50 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">
              Verification Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Your account needs to be verified before you can perform transactions. Please use our Vault OS mobile app to complete your KYC verification securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsKycDialogOpen(false)} className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90">
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return { checkKyc, KycGuardDialog };
}
