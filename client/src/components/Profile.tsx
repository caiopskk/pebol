import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { motion } from "framer-motion";
import type { AccountUser } from "../api.js";

interface ProfileProps {
  account: AccountUser;
  onBack: () => void;
  onSaveProfile: (username: string) => Promise<void>;
  onSavePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onUploadAvatar: (file: File, crop?: { x: number; y: number; size: number }) => Promise<void>;
}

const fieldClass =
  "min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 py-2 font-body text-sm font-semibold text-pebol-text outline-none transition-all duration-300 placeholder:text-pebol-faint focus:border-pebol-accent/55 focus:ring-2 focus:ring-pebol-accent/15";
const primaryClass =
  "pebol-glow-button pebol-glow-fill min-h-11 rounded-lg border-0 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-2.5 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5";
const secondaryClass =
  "pebol-glow-button min-h-11 rounded-lg border-0 bg-white/[0.055] px-5 py-2.5 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-pebol-blue/15";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || "P").slice(0, 2).toUpperCase();
}

export function Profile({
  account,
  onBack,
  onSaveProfile,
  onSavePassword,
  onUploadAvatar,
}: ProfileProps) {
  const [username, setUsername] = useState(account.username);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const avatarUrl = avatarPreview ?? account.avatarUrl;
  const avatarLabel = useMemo(() => initials(username || account.username), [username, account.username]);

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarCropOpen(true);
    event.target.value = "";
  };

  useEffect(() => {
    if (!avatarPreview || !avatarCropOpen) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [avatarPreview, avatarCropOpen]);

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () => reject(new Error("Failed to load image")));
      image.src = url;
    });

  const getCroppedImageBlob = async (imageSrc: string, pixelCrop: Area, type: string) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("Failed to create cropped image"));
        else resolve(blob);
      }, type);
    });
  };

  const applyCrop = async () => {
    if (!avatarFile || !avatarPreview || !croppedAreaPixels) return;
    setAvatarBusy(true);
    try {
      const blob = await getCroppedImageBlob(avatarPreview, croppedAreaPixels, avatarFile.type);
      const croppedFile = new File([blob], avatarFile.name, { type: avatarFile.type });
      await onUploadAvatar(croppedFile, {
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        size: Math.round(croppedAreaPixels.width),
      });
      setAvatarCropOpen(false);
      setAvatarFile(null);
      setAvatarPreview(URL.createObjectURL(croppedFile));
    } finally {
      setAvatarBusy(false);
    }
  };

  const cancelCrop = () => {
    setAvatarCropOpen(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileBusy(true);
    try {
      await onSaveProfile(username);
    } finally {
      setProfileBusy(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPasswordBusy(true);
    try {
      await onSavePassword(
        String(data.get("currentPassword") ?? ""),
        String(data.get("newPassword") ?? ""),
      );
      event.currentTarget.reset();
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <>
      <motion.div
        className="min-h-screen px-4 py-6 font-body text-pebol-text sm:px-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
      <div className="mx-auto grid max-w-3xl gap-4">
        <header className="relative overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(0,255,135,.14),transparent_34%),radial-gradient(circle_at_8%_100%,rgba(255,206,84,.1),transparent_38%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                Conta
              </span>
              <h1 className="mt-1 font-title text-3xl uppercase tracking-[0.02em] text-pebol-text">
                Editar perfil
              </h1>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">
                Ajuste seu nome, imagem e senha.
              </p>
            </div>
            <button type="button" className={secondaryClass} onClick={onBack}>
              Voltar
            </button>
          </div>
        </header>

        <section className="grid gap-4 rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <div className="grid justify-items-center gap-3">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-lg border border-pebol-accent/35 bg-gradient-to-br from-pebol-accent/20 via-pebol-gold/10 to-black shadow-glow">
              {avatarUrl ? (
                <img
                  className="h-full w-full object-cover"
                  src={avatarUrl}
                  alt={`Imagem de perfil de ${account.username}`}
                />
              ) : (
                <span className="font-display text-3xl font-black text-white">
                  {avatarLabel}
                </span>
              )}
            </div>
            <label className={`${secondaryClass} m-0 cursor-pointer text-center`}>
              {avatarBusy ? "Enviando..." : "Trocar imagem"}
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void changeAvatar(event)}
                disabled={avatarBusy}
              />
            </label>
            <span className="text-center text-xs font-semibold text-pebol-muted">
              PNG, JPG ou WEBP até 2 MB.
            </span>
          </div>

          <form className="grid gap-3" onSubmit={submitProfile}>
            <label className="m-0 grid gap-1 text-xs font-bold text-pebol-muted">
              Nome de usuário
              <input
                className={fieldClass}
                value={username}
                maxLength={20}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <button type="submit" className={primaryClass} disabled={profileBusy}>
              {profileBusy ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>
        </section>

        <form className="grid gap-3 rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl" onSubmit={submitPassword}>
          <div>
            <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-muted">
              Segurança
            </span>
            <h2 className="mt-1 font-title text-xl uppercase tracking-[0.02em] text-pebol-text">
              Trocar senha
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="m-0 grid gap-1 text-xs font-bold text-pebol-muted">
              Senha atual
              <input className={fieldClass} name="currentPassword" type="password" autoComplete="current-password" />
            </label>
            <label className="m-0 grid gap-1 text-xs font-bold text-pebol-muted">
              Nova senha
              <input className={fieldClass} name="newPassword" type="password" autoComplete="new-password" />
            </label>
          </div>
          <button type="submit" className={primaryClass} disabled={passwordBusy}>
            {passwordBusy ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>
    </motion.div>

    {avatarCropOpen && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-pebol-panel p-5 shadow-premium">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-title uppercase tracking-[0.02em] text-white">Ajustar área do avatar</h2>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">
                Escolha a parte da imagem que vai aparecer no seu perfil.
              </p>
            </div>
            <button type="button" className={secondaryClass} onClick={cancelCrop}>
              Fechar
            </button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="mx-auto w-full max-w-[24rem] overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
              <div className="relative h-72 bg-black">
                {avatarPreview && (
                  <Cropper
                    image={avatarPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                    objectFit="horizontal-cover"
                    cropShape="rect"
                    showGrid={false}
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="grid gap-3">
                <label className="grid gap-2 text-sm font-semibold text-white">
                  Zoom
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-snug text-slate-300">
                <p>Arraste a imagem para ajustar a área selecionada.</p>
                <p className="mt-2 text-xs text-pebol-muted">
                  zoom: {zoom.toFixed(2)}x
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className={secondaryClass} onClick={cancelCrop}>
              Cancelar
            </button>
            <button type="button" className={primaryClass} onClick={applyCrop} disabled={avatarBusy}>
              {avatarBusy ? "Aplicando..." : "Usar esta área"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
