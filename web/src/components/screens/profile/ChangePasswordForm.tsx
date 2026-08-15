"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await clientFetch("/api/proxy/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="mb-4">
        <Field label="CURRENT PASSWORD">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
      </div>
      <div className="mb-4">
        <Field label="NEW PASSWORD">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
      </div>
      <div className="mb-5">
        <Field label="CONFIRM NEW PASSWORD">
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        {mismatch && <p className="mt-1.5 text-[11.5px] font-semibold text-red">Passwords don&apos;t match.</p>}
      </div>

      {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}
      {success && (
        <p className="mb-4 text-[12.5px] font-semibold text-accent2">
          Password changed. Your other sessions have been signed out.
        </p>
      )}

      <Button type="submit" disabled={!currentPassword || newPassword.length < 8 || mismatch || submitting}>
        {submitting ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
