import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, ArrowLeft, CheckCircle2 } from "lucide-react";

const KYC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, path: string) => {
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    if (!idFront || !idBack || !selfie) {
      toast.error("Please upload all three documents");
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const basePath = `${user.id}`;
      const [frontPath, backPath, selfiePath] = await Promise.all([
        uploadFile(idFront, `${basePath}/id-front.${idFront.name.split(".").pop()}`),
        uploadFile(idBack, `${basePath}/id-back.${idBack.name.split(".").pop()}`),
        uploadFile(selfie, `${basePath}/selfie.${selfie.name.split(".").pop()}`),
      ]);

      // Check for existing KYC doc
      const { data: existing } = await supabase
        .from("kyc_documents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        await supabase.from("kyc_documents").update({
          id_front_url: frontPath,
          id_back_url: backPath,
          selfie_url: selfiePath,
          submitted_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
        }).eq("user_id", user.id);
      } else {
        await supabase.from("kyc_documents").insert({
          user_id: user.id,
          id_front_url: frontPath,
          id_back_url: backPath,
          selfie_url: selfiePath,
        });
      }

      // Reset kyc status to pending if rejected
      if (profile?.kyc_status === "rejected") {
        await supabase.from("profiles").update({ kyc_status: "pending", kyc_rejection_reason: null }).eq("user_id", user.id);
      }

      await refreshProfile();
      toast.success("KYC documents submitted! We'll review them shortly.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    }
    setLoading(false);
  };

  const FileUploadBox = ({
    label,
    file,
    onFile,
    inputRef,
    icon: Icon,
  }: {
    label: string;
    file: File | null;
    onFile: (f: File) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    icon: typeof Camera;
  }) => (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 p-6 transition-colors hover:border-primary/50 hover:bg-primary/5"
    >
      {file ? (
        <CheckCircle2 className="h-8 w-8 text-success" />
      ) : (
        <Icon className="h-8 w-8 text-muted-foreground" />
      )}
      <span className="text-sm font-medium">{file ? file.name : label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="mb-1 text-xl font-bold font-display">KYC Verification</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Upload your ID documents and a selfie to verify your identity.
        </p>

        <div className="space-y-4">
          <FileUploadBox label="ID Front" file={idFront} onFile={setIdFront} inputRef={frontRef as React.RefObject<HTMLInputElement>} icon={Upload} />
          <FileUploadBox label="ID Back" file={idBack} onFile={setIdBack} inputRef={backRef as React.RefObject<HTMLInputElement>} icon={Upload} />
          <FileUploadBox label="Selfie" file={selfie} onFile={setSelfie} inputRef={selfieRef as React.RefObject<HTMLInputElement>} icon={Camera} />
        </div>

        <Button className="mt-6 w-full" size="lg" onClick={handleSubmit} disabled={loading}>
          {loading ? "Uploading..." : "Submit for Verification"}
        </Button>
      </div>
    </div>
  );
};

export default KYC;
