"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface Slide {
  id: number;
  image: string;
  alt: string;
  order: number;
  active: boolean;
}

interface SlideForm {
  id: number;
  image: string;
  alt: string;
  order: string;
  active: boolean;
}

const blank = (): SlideForm => ({ id: 0, image: "", alt: "", order: "10", active: true });

export default function AdminHeroSlidesPage() {
  const { toast, confirm } = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SlideForm | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/hero-slides", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSlides(data.slides ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (slide: Slide) => {
    const approved = await confirm({
      title: "Delete hero slide?",
      message: "This image will be permanently removed from the homepage carousel.",
      confirmText: "Delete",
      danger: true,
    });
    if (!approved) return;
    const response = await fetch("/api/admin/hero-slides", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slide.id }),
    });
    if (!response.ok) {
      toast("Could not delete hero slide", "error");
      return;
    }
    setSlides((current) => current.filter((item) => item.id !== slide.id));
    toast("Hero slide deleted");
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Hero Slides</h1>
          <p className="mt-1 text-sm text-navy-800/55">Manage the images shown in the homepage hero carousel.</p>
        </div>
        <button onClick={() => setEditing(blank())} className="btn-primary shrink-0">+ Add Slide</button>
      </div>

      {loading ? (
        <div className="mt-6 rounded-lg bg-white py-16 text-center text-sm text-navy-800/50">Loading slides...</div>
      ) : slides.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-navy-800/15 bg-white px-6 py-16 text-center">
          <p className="font-semibold text-navy-800">No custom hero slides yet</p>
          <p className="mt-1 text-sm text-navy-800/50">The default website images are currently being used.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide) => (
            <article key={slide.id} className="overflow-hidden rounded-lg border border-navy-800/10 bg-white shadow-sm">
              <div className="relative aspect-[16/9] bg-navy-50">
                <Image src={slide.image} alt={slide.alt || "Hero slide"} fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover" />
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${slide.active ? "bg-emerald-500 text-white" : "bg-white/90 text-navy-800/60"}`}>
                  {slide.active ? "Active" : "Hidden"}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-navy-900/75 px-2.5 py-1 text-xs font-bold text-white">Order {slide.order}</span>
              </div>
              <div className="flex items-center gap-3 p-4">
                <p className="min-w-0 flex-1 truncate text-sm text-navy-800/65">{slide.alt || "No image description"}</p>
                <button
                  onClick={() => setEditing({ id: slide.id, image: slide.image, alt: slide.alt, order: String(slide.order), active: slide.active })}
                  className="rounded-lg bg-navy-50 px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-navy-100"
                >
                  Replace
                </button>
                <button onClick={() => remove(slide)} aria-label="Remove slide" title="Remove slide" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <SlideModal
          data={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            toast("Hero slide saved");
          }}
        />
      )}
    </div>
  );
}

function SlideModal({ data, onClose, onSaved }: { data: SlideForm; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(data);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = form.id > 0;

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async () => {
    if (!isEdit && !file) {
      setError("Choose a hero image.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = new FormData();
      payload.append("id", String(form.id));
      payload.append("alt", form.alt);
      payload.append("order", form.order);
      payload.append("active", String(form.active));
      if (file) payload.append("image", file);
      const response = await fetch("/api/admin/hero-slides", {
        method: isEdit ? "PATCH" : "POST",
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Save failed");
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-bold text-navy-800">{isEdit ? "Replace Hero Slide" : "Add Hero Slide"}</h2>

        <div className="mt-5 space-y-5">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-navy-50">
            {preview || form.image ? (
              <Image src={preview || form.image} alt="" fill sizes="560px" className="object-cover" unoptimized={Boolean(preview)} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-navy-800/45">Image preview</div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">{isEdit ? "Replace image (optional)" : "Hero image"}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-navy-800/60 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2.5 file:font-semibold file:text-navy-800" />
            <p className="mt-1.5 text-xs text-navy-800/45">JPG, PNG or WebP. Use a landscape image, ideally 1920 × 1080.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Image description</label>
            <input value={form.alt} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, alt: event.target.value }))} className="input" placeholder="e.g. New season clothing collection" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Display order</label>
              <input type="number" min="0" max="9999" value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))} className="input" />
            </div>
            <label className="flex items-center gap-3 self-end rounded-lg border border-navy-800/10 px-4 py-3">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-5 w-5 accent-brand" />
              <span className="text-sm font-medium text-navy-800">Active</span>
            </label>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Slide"}</button>
        </div>
      </div>
    </div>
  );
}
