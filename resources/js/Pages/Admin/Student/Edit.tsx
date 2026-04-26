import BlastSonner, { BlastType } from "@/Components/custom/BlastSonner";
import { ErrorInput, SelectSearchInput } from "@/Components/custom/FormElement";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { MainLayout } from "@/Layouts/MainLayout";
import { PageTitle } from "@/Partials/PageTitle";
import { handleNipNisInput } from "@/Services/additionalService";
import { Student } from "@/Types/student";
import { useForm, router } from "@inertiajs/react";
import React, { useRef, useState, useEffect } from "react";
import { FiCamera, FiLoader, FiSave, FiTrash2, FiUser } from "react-icons/fi";

type AdminStudentEditProps = {
    title?: string;
    student: Student;
    workshops: {
        label: string;
        value: string;
    }[];
};

export default function AdminStudentEdit({
    title,
    student,
    workshops,
}: AdminStudentEditProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        student.profile_photo_url || null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data, setData, errors, setError, clearErrors } = useForm({
        nis: student.nis || "",
        full_name: student.full_name || "",
        class: student.class || "",
        major: student.major || "",
        workshop_id: student.workshop_id?.toString() || "",
        gelombang: student.gelombang?.toString() || "",
        profile_photo: null as File | null,
        remove_photo: false as boolean,
    });

    // Reset form ketika student berubah (misal navigasi Inertia)
    useEffect(() => {
        setData({
            nis: student.nis || "",
            full_name: student.full_name || "",
            class: student.class || "",
            major: student.major || "",
            workshop_id: student.workshop_id?.toString() || "",
            gelombang: student.gelombang?.toString() || "",
            profile_photo: null,
            remove_photo: false,
        });
        setPreviewUrl(student.profile_photo_url || null);
    }, [student]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setError("profile_photo", "Format file harus JPG, PNG, atau WebP");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError("profile_photo", "Ukuran file maksimal 2MB");
            return;
        }

        clearErrors("profile_photo");
        setData("profile_photo", file);
        setData("remove_photo", false);

        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPreviewUrl(null);
        setData("profile_photo", null);
        setData("remove_photo", true);
        clearErrors("profile_photo");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleErrorInput = () => {
        const fields: { key: keyof typeof data; message: string }[] = [
            { key: "nis", message: "NISN tidak boleh kosong" },
            { key: "full_name", message: "Nama tidak boleh kosong" },
            { key: "class", message: "Kelas tidak boleh kosong" },
            { key: "major", message: "Jurusan tidak boleh kosong" },
            { key: "workshop_id", message: "Lokasi Prakerin tidak boleh kosong" },
            { key: "gelombang", message: "Gelombang harus dipilih" },
        ];

        let hasError = false;
        fields.forEach(({ key, message }) => {
            if (!data[key]) {
                setError(key, message);
                hasError = true;
            } else {
                clearErrors(key);
            }
        });

        return hasError;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const hasError = handleErrorInput();
        if (hasError) return;

        clearErrors();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("nis", data.nis);
        formData.append("full_name", data.full_name);
        formData.append("class", data.class);
        formData.append("major", data.major);
        formData.append("workshop_id", data.workshop_id);
        formData.append("gelombang", data.gelombang);

        if (data.profile_photo) {
            formData.append("profile_photo", data.profile_photo);
        }

        if (data.remove_photo) {
            formData.append("remove_photo", "1");
        }

        // PERBAIKAN: Hapus _method=PUT karena route sudah menggunakan POST
        // Route::post('/{id}', 'update') tidak butuh method spoofing

        router.post(`/admin/student/${student.id}`, formData, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
            forceFormData: true,
            onSuccess: () => {
                BlastSonner({
                    type: BlastType.SUCCESS,
                    message: "Data siswa berhasil diperbarui",
                });
                router.reload({ only: ["student"] });
            },
            onError: (errors) => {
                console.error("Error:", errors);
                BlastSonner({
                    type: BlastType.ERROR,
                    message:
                        Object.values(errors).join(", ") || "Gagal menyimpan data",
                });
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <MainLayout title={title as string}>
            <PageTitle
                title={title as string}
                description="Perbarui informasi Siswa Prakerin"
            />

            <form onSubmit={handleSubmit}>
                {/* Foto Profil */}
                <div className="mb-6">
                    <label className="text-base mb-2 block">Foto Profil</label>
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={() => setPreviewUrl(null)}
                                />
                            ) : (
                                <FiUser className="text-gray-400 text-4xl" />
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                <FiCamera className="text-base" />
                                <span>{previewUrl ? "Ganti Foto" : "Pilih Foto"}</span>
                            </button>

                            {previewUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                                >
                                    <FiTrash2 className="text-base" />
                                    <span>Hapus Foto</span>
                                </button>
                            )}
                        </div>

                        <p className="text-xs text-gray-400">
                            Format : JPG, PNG, WebP. Maksimal 2MB.
                        </p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,image/webp"
                            className="hidden"
                            onChange={handlePhotoChange}
                        />
                    </div>
                    {errors.profile_photo && (
                        <ErrorInput error={errors.profile_photo} />
                    )}
                </div>

                {/* NISN */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">NISN Siswa Prakerin</label>
                        <Input
                            type="text"
                            placeholder="Masukkan NISN"
                            value={data.nis}
                            onChange={(e) =>
                                setData("nis", handleNipNisInput(e.target.value))
                            }
                            className={`py-6 ${errors.nis ? "border-red-500" : ""}`}
                        />
                        {errors.nis && <ErrorInput error={errors.nis} />}
                    </div>
                </div>

                {/* Nama */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Nama Siswa Prakerin</label>
                        <Input
                            type="text"
                            placeholder="Masukkan Nama Lengkap"
                            value={data.full_name}
                            onChange={(e) => setData("full_name", e.target.value)}
                            className={`py-6 ${errors.full_name ? "border-red-500" : ""}`}
                        />
                        {errors.full_name && <ErrorInput error={errors.full_name} />}
                    </div>
                </div>

                {/* Kelas */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Kelas</label>
                        <Input
                            type="text"
                            placeholder="Masukkan Kelas"
                            value={data.class}
                            onChange={(e) => setData("class", e.target.value)}
                            className={`py-6 ${errors.class ? "border-red-500" : ""}`}
                        />
                        {errors.class && <ErrorInput error={errors.class} />}
                    </div>
                </div>

                {/* Jurusan */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Jurusan</label>
                        <Input
                            type="text"
                            placeholder="Masukkan Jurusan"
                            value={data.major}
                            onChange={(e) => setData("major", e.target.value)}
                            className={`py-6 ${errors.major ? "border-red-500" : ""}`}
                        />
                        {errors.major && <ErrorInput error={errors.major} />}
                    </div>
                </div>

                {/* Gelombang */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Gelombang</label>
                        <select
                            value={data.gelombang}
                            onChange={(e) => setData("gelombang", e.target.value)}
                            className={`w-full border rounded-lg px-3 py-3 text-base bg-white ${
                                errors.gelombang ? "border-red-500" : "border-gray-300"
                            }`}
                        >
                            <option value="">Pilih Gelombang</option>
                            <option value="1">Gelombang 1</option>
                            <option value="2">Gelombang 2</option>
                        </select>
                        {errors.gelombang && <ErrorInput error={errors.gelombang} />}
                    </div>
                </div>

                {/* Lokasi Prakerin */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Tempat Lokasi Prakerin</label>
                        <SelectSearchInput
                            value={data.workshop_id}
                            options={workshops}
                            onChange={(value) =>
                                setData("workshop_id", value.toString())
                            }
                            placeholder="Pilih Tempat Prakerin"
                            removeValue={() => setData("workshop_id", "")}
                        />
                        {errors.workshop_id && (
                            <ErrorInput error={errors.workshop_id} />
                        )}
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full mt-4 p-6 bg-blue-500 hover:bg-blue-600"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <FiLoader className="animate-spin" />
                    ) : (
                        <span className="flex items-center gap-2">
                            <FiSave />
                            <span>Simpan</span>
                        </span>
                    )}
                </Button>
            </form>
        </MainLayout>
    );
}