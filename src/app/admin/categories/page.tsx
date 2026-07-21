"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  parentName: string | null;
  imageUrl: string;
  hasUploadedImage: boolean;
  homepageVisible: boolean;
  shopVisible: boolean;
  homepageOrder: number;
  homepageHref: string;
  productCount: number;
}

interface CategoryForm {
  id: number;
  name: string;
  slug: string;
  parentId: string;
  imageUrl: string;
  hasUploadedImage: boolean;
  homepageVisible: boolean;
  shopVisible: boolean;
}

const blank: CategoryForm = {
  id: 0,
  name: "",
  slug: "",
  parentId: "",
  imageUrl: "",
  hasUploadedImage: false,
  homepageVisible: false,
  shopVisible: false,
};

export default function AdminCategoriesPage() {
  const { toast, confirm } = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryForm | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/categories", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setCats(data.categories ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) setEditing({ ...blank });
  }, []);

  const edit = (category: Category) =>
    setEditing({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ? String(category.parentId) : "",
      imageUrl: category.imageUrl,
      hasUploadedImage: category.hasUploadedImage,
      homepageVisible: category.homepageVisible,
      shopVisible: category.shopVisible,
    });

  const del = async (category: Category) => {
    const ok = await confirm({
      title: "Delete category?",
      message:
        category.productCount > 0
          ? `“${category.name}” has ${category.productCount} product(s). Deleting it won't remove them, but they'll lose this category.`
          : `Delete the category “${category.name}”?`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    const response = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: category.id }),
    });
    if (!response.ok) {
      toast("Could not delete category", "error");
      return;
    }
    setCats((previous) => previous.filter((item) => item.id !== category.id));
    toast(`Deleted “${category.name}”`);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Categories</h1>
          <p className="mt-1 text-sm text-navy-800/55">
            Manage product categories and choose which ones appear on the homepage.
          </p>
        </div>
        <button onClick={() => setEditing({ ...blank })} className="btn-primary shrink-0">
          + Add Category
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-5 py-4">Image</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Slug</th>
              <th className="px-5 py-4">Storefront</th>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Products</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">Loading…</td>
              </tr>
            ) : cats.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">No categories</td>
              </tr>
            ) : (
              cats.map((category) => (
                <tr key={category.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-5 py-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-navy-50 ring-1 ring-navy-800/10">
                      <Image
                        src={category.imageUrl || "/images/placeholder.svg"}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy-800">{category.name}</p>
                    {category.parentName && (
                      <p className="mt-0.5 text-xs text-navy-800/45">Under {category.parentName}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-navy-800/60">{category.slug}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${category.homepageVisible ? "bg-emerald-50 text-emerald-700" : "bg-navy-50 text-navy-800/45"}`}>
                        Home {category.homepageVisible ? "on" : "off"}
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${category.shopVisible ? "bg-blue-50 text-blue-700" : "bg-navy-50 text-navy-800/45"}`}>
                        Shop {category.shopVisible ? "on" : "off"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-navy-800/70">{category.homepageOrder}</td>
                  <td className="px-5 py-3 text-navy-800/70">{category.productCount}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => edit(category)}
                        className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(category)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryModal
          data={editing}
          cats={cats}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            toast("Category saved");
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({
  data,
  cats,
  onClose,
  onSaved,
}: {
  data: CategoryForm;
  cats: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(data);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeUploadedImage, setRemoveUploadedImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = form.id > 0;

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Save failed");
      const categoryId = Number(result.id || form.id);

      if (removeUploadedImage && !imageFile) {
        const removeResponse = await fetch("/api/admin/categories/image", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        });
        if (!removeResponse.ok) {
          const removeResult = await removeResponse.json();
          throw new Error(removeResult.error || "Could not remove image");
        }
      }

      if (imageFile) {
        const upload = new FormData();
        upload.append("categoryId", String(categoryId));
        upload.append("image", imageFile);
        const uploadResponse = await fetch("/api/admin/categories/image", {
          method: "POST",
          body: upload,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || "Image upload failed");
      }

      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const shownImage = previewUrl || (!removeUploadedImage ? form.imageUrl : "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-navy-800">
          {isEdit ? "Edit Category" : "Add Category"}
        </h2>

        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="input"
                placeholder="e.g. Men's Clothing"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Slug (optional)</label>
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className="input"
                placeholder="Auto-created from name"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Parent Category</label>
            <select
              value={form.parentId}
              onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
              className="input"
            >
              <option value="">None (top-level)</option>
              {cats
                .filter((category) => category.id !== form.id)
                .map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
            </select>
          </div>

          <div className="rounded-2xl border border-navy-800/10 bg-navy-50/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-navy-800">Show on homepage</p>
                <p className="mt-0.5 text-xs text-navy-800/50">Display this category in Shopping By Categories.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.homepageVisible}
                onClick={() => setForm((current) => ({ ...current, homepageVisible: !current.homepageVisible }))}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.homepageVisible ? "bg-brand" : "bg-navy-800/20"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${form.homepageVisible ? "left-6" : "left-1"}`} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-navy-800/10 pt-4">
              <div>
                <p className="text-sm font-semibold text-navy-800">Show in shop filters</p>
                <p className="mt-0.5 text-xs text-navy-800/50">Add this category as a filter button on the Shop page.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Show in shop filters"
                aria-checked={form.shopVisible}
                onClick={() => setForm((current) => ({ ...current, shopVisible: !current.shopVisible }))}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.shopVisible ? "bg-brand" : "bg-navy-800/20"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${form.shopVisible ? "left-6" : "left-1"}`} />
              </button>
            </div>

          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-800">Category image</label>
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-navy-800/15 bg-white p-5 text-center transition hover:border-brand/60 hover:bg-brand-50/30 sm:flex-row sm:text-left">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-navy-50 ring-1 ring-navy-800/10">
                {shownImage ? (
                  <Image src={shownImage} alt="Category preview" fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-navy-800/35">No image</div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-800">
                  {imageFile ? imageFile.name : "Choose image from your computer"}
                </p>
                <p className="mt-1 text-xs text-navy-800/50">JPG, PNG or WebP · maximum 5 MB</p>
                <span className="mt-3 inline-flex rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white">
                  Browse files
                </span>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) setRemoveUploadedImage(false);
                }}
              />
            </label>
            {form.hasUploadedImage && !removeUploadedImage && !imageFile && (
              <button
                type="button"
                onClick={() => setRemoveUploadedImage(true)}
                className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Remove uploaded image
              </button>
            )}
            {removeUploadedImage && (
              <button
                type="button"
                onClick={() => setRemoveUploadedImage(false)}
                className="mt-2 text-xs font-semibold text-navy-800/60 hover:text-navy-800"
              >
                Keep current image
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save Category"}
          </button>
        </div>
      </div>
    </div>
  );
}
