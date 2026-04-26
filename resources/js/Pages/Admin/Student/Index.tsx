import { ImportFileDrawer, SearchInput } from "@/Components/custom/FormElement";
import NotFoundInList from "@/Components/custom/NotFoundInList";
import { Button } from "@/Components/ui/button";
import { Card } from "@/Components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../../Components/ui/tabs";
import { MainLayout } from "@/Layouts/MainLayout";
import { PageTitle } from "@/Partials/PageTitle";
import { inputDebounce } from "@/Services/additionalService";
import { Student } from "@/Types/student";
import { Link, router, useForm } from "@inertiajs/react";
import { ArrowUpFromLine, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { ChangeEvent, useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import BlastSonner, { BlastType } from "@/Components/custom/BlastSonner";

export type AdminStudentIndexProps = {
    title?: string;
    students: Student[];
};

const MAJORS = [
    { value: "TKJ", label: "TEKNIK KOMPUTER JARINGAN", shortLabel: "TKJ" },
    { value: "TSM", label: "TEKNIK SEPEDA MOTOR", shortLabel: "TSM" },
    { value: "TBOG", label: "TATA BOGA", shortLabel: "TBOG" },
] as const;

type MajorValue = typeof MAJORS[number]["value"];

const GELOMBANGS = [
    { value: "G1", label: "Gelombang 1", shortLabel: "Gel. 1" },
    { value: "G2", label: "Gelombang 2", shortLabel: "Gel. 2" },
] as const;

type GelombangValue = typeof GELOMBANGS[number]["value"];

const PER_PAGE = 20;

function normalizeGelombang(val: unknown): 1 | 2 | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") {
        if (val === 1) return 1;
        if (val === 2) return 2;
        return null;
    }

    const str = String(val).toLowerCase().trim();
    const gelombangOnePatterns = ["1", "gelombang 1", "gelombang1", "gel. 1", "gel.1", "g1", "wave1", "wave 1", "batch1", "batch 1"];
    const gelombangTwoPatterns = ["2", "gelombang 2", "gelombang2", "gel. 2", "gel.2", "g2", "wave2", "wave 2", "batch2", "batch 2"];

    if (gelombangOnePatterns.includes(str)) return 1;
    if (gelombangTwoPatterns.includes(str)) return 2;

    return null;
}

function isMajorMatch(student: Student, majorValue: MajorValue): boolean {
    const majorLabel = MAJORS.find((m) => m.value === majorValue)?.label ?? "";
    const m = (student.major ?? "").toUpperCase().trim();
    return m === majorLabel || m === majorValue;
}

function filterByMajorAndGelombang(data: Student[], majorValue: MajorValue, gelombang: GelombangValue): Student[] {
    const targetGelombang = gelombang === "G1" ? 1 : 2;

    return data.filter((s) => {
        if (!isMajorMatch(s, majorValue)) return false;
        const normalized = normalizeGelombang(s.gelombang);
        return normalized === targetGelombang;
    });
}

function filterByMajorOnly(data: Student[], majorValue: MajorValue): Student[] {
    return data.filter((s) => isMajorMatch(s, majorValue));
}

type PaginationControlsProps = {
    majorValue: MajorValue;
    gelombang: GelombangValue;
    currentPage: number;
    totalPages: number;
    total: number;
    onPageChange: (major: MajorValue, gelombang: GelombangValue, page: number) => void;
};

function PaginationControls({
    majorValue,
    gelombang,
    currentPage,
    totalPages,
    total,
    onPageChange,
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * PER_PAGE + 1;
    const endItem = Math.min(currentPage * PER_PAGE, total);

    const getPageNumbers = (): number[] => {
        const delta = 2;
        const nums: number[] = [];
        for (
            let i = Math.max(1, currentPage - delta);
            i <= Math.min(totalPages, currentPage + delta);
            i++
        ) {
            nums.push(i);
        }
        return nums;
    };

    return (
        <div className="flex flex-col items-center gap-2 py-3">
            <p className="text-xs text-gray-500">
                Menampilkan{" "}
                <span className="font-semibold text-gray-700">{startItem}–{endItem}</span>
                {" "}dari{" "}
                <span className="font-semibold text-gray-700">{total}</span> siswa
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(majorValue, gelombang, currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((pageNum) => (
                    <button
                        key={pageNum}
                        type="button"
                        onClick={() => onPageChange(majorValue, gelombang, pageNum)}
                        className={`flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-semibold transition-colors ${pageNum === currentPage
                            ? "bg-blue-500 border-blue-500 text-white shadow"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        {pageNum}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => onPageChange(majorValue, gelombang, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

export default function AdminStudentIndex({ title, students }: AdminStudentIndexProps) {
    const { flash } = usePage().props as any;

    const [studentsData, setStudentsData] = useState<Student[]>(students);
    const [searchValue, setSearchValue] = useState<string>("");
    const [activeMajor, setActiveMajor] = useState<MajorValue>("TKJ");
    const [activeGelombang, setActiveGelombang] = useState<GelombangValue>("G1");
    const [pages, setPages] = useState<Record<string, number>>({
        "TKJ_G1": 1,
        "TKJ_G2": 1,
        "TSM_G1": 1,
        "TSM_G2": 1,
        "TBOG_G1": 1,
        "TBOG_G2": 1,
    });

    const [importDrawerOpen, setImportDrawerOpen] = useState<boolean>(false);
    const [onImport, setOnImport] = useState<boolean>(false);

    const { data, post, setData } = useForm({ file_excel: null as File | null });

    useEffect(() => {
        if (flash?.success) {
            BlastSonner({ type: BlastType.SUCCESS, message: flash.success });
        }
    }, [flash?.success]);

    useEffect(() => {
        if (import.meta.env.DEV && students.length > 0) {
            console.table(
                students.slice(0, 10).map((s) => ({
                    name: s.full_name,
                    major: s.major,
                    gelombang_raw: s.gelombang,
                    gelombang_type: typeof s.gelombang,
                    gelombang_normalized: normalizeGelombang(s.gelombang),
                }))
            );
        }
    }, [students]);

    const handleImport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.file_excel) return;
        setOnImport(true);
        post(`/admin/student/import`, {
            headers: { "Content-Type": "multipart/form-data" },
            preserveScroll: true,
            replace: true,
            onError: (error: any) => {
                setOnImport(false);
                BlastSonner({ type: BlastType.ERROR, message: error.message || "Gagal mengimpor data" });
            },
            onFinish: () => {
                setOnImport(false);
                setImportDrawerOpen(false);
                setData("file_excel", null);
            },
        });
    };

    const debouncedSearch = inputDebounce(async (value: string) => {
        router.get(
            "/admin/student",
            { search: value },
            {
                preserveState: true,
                replace: true,
                onSuccess: (page: any) => {
                    setStudentsData(page.props.students as Student[]);
                    setPages({
                        "TKJ_G1": 1, "TKJ_G2": 1,
                        "TSM_G1": 1, "TSM_G2": 1,
                        "TBOG_G1": 1, "TBOG_G2": 1,
                    });
                },
                onError: (error: any) => {
                    console.error("Search error:", error);
                },
            }
        );
    });

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);
        debouncedSearch(value);
    };

    const handleMajorChange = (value: string) => {
        if (value !== "TKJ" && value !== "TSM" && value !== "TBOG") return;
        setActiveMajor(value as MajorValue);
        setSearchValue("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleGelombangChange = (value: string) => {
        if (value !== "G1" && value !== "G2") return;
        setActiveGelombang(value as GelombangValue);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePageChange = (majorValue: MajorValue, gelombang: GelombangValue, page: number) => {
        if (page < 1) return;
        const key = `${majorValue}_${gelombang}`;
        setPages((prev) => ({ ...prev, [key]: page }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const getPageData = (majorValue: MajorValue, gelombang: GelombangValue) => {
        try {
            const filtered = filterByMajorAndGelombang(studentsData, majorValue, gelombang);
            const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
            const key = `${majorValue}_${gelombang}`;
            const currentPage = Math.min(pages[key] ?? 1, totalPages);
            const start = (currentPage - 1) * PER_PAGE;
            const paginated = filtered.slice(start, start + PER_PAGE);
            return { paginated, totalPages, total: filtered.length, currentPage };
        } catch (error) {
            console.error("Error getting page data:", error);
            return { paginated: [], totalPages: 1, total: 0, currentPage: 1 };
        }
    };

    const getMajorGelombangCount = (majorValue: MajorValue, gelombang: GelombangValue) =>
        filterByMajorAndGelombang(students, majorValue, gelombang).length;

    const getMajorTotalCount = (majorValue: MajorValue) =>
        filterByMajorOnly(students, majorValue).length;

    const getGelombangLabel = (gelombang: unknown): string => {
        const normalized = normalizeGelombang(gelombang);
        if (normalized === 1) return "1";
        if (normalized === 2) return "2";
        return "-";
    };

    const { paginated: currentPaginated, totalPages: currentTotalPages, total: currentTotal, currentPage: currentCurrentPage } = getPageData(activeMajor, activeGelombang);

    return (
        <MainLayout title="Data Siswa">
            <PageTitle
                title={title as string}
                description="Seluruh informasi Siswa yang terdaftar di sistem"
            />

            <Link href="/admin/student/create">
                <Button
                    size="lg"
                    variant="outline"
                    className="w-full bg-green-200 border mb-3 hover:bg-green-300 flex justify-center items-center gap-2"
                >
                    <PlusCircle size={20} />
                    <span>Tambah Siswa Prakerin</span>
                </Button>
            </Link>

            <Button
                size="lg"
                onClick={() => setImportDrawerOpen(true)}
                variant="outline"
                className="w-full bg-blue-200 border mb-5 hover:bg-blue-300 flex justify-center items-center gap-2"
            >
                <ArrowUpFromLine size={20} />
                <span>Import Data Siswa Prakerin</span>
            </Button>

            <Tabs
                defaultValue="TKJ"
                value={activeMajor}
                onValueChange={handleMajorChange}
                className="w-full mb-3"
            >
                <TabsList className="grid w-full grid-cols-3">
                    {MAJORS.map((major) => (
                        <TabsTrigger key={major.value} value={major.value} className="flex gap-2">
                            {major.shortLabel}
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                                {getMajorTotalCount(major.value)}
                            </span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <Tabs
                defaultValue="G1"
                value={activeGelombang}
                onValueChange={handleGelombangChange}
                className="w-full mb-5"
            >
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="G1" className="flex gap-2">
                        Gelombang 1
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                            {getMajorGelombangCount(activeMajor, "G1")}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="G2" className="flex gap-2">
                        Gelombang 2
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                            {getMajorGelombangCount(activeMajor, "G2")}
                        </span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <SearchInput
                className="mb-5"
                value={searchValue}
                onChange={handleSearch}
                placeholder={`Cari NISN atau Nama Siswa - ${activeMajor} ${activeGelombang === "G1" ? "Gelombang 1" : "Gelombang 2"}`}
            />

            <ImportFileDrawer
                title="Import Data Siswa Prakerin"
                description="Import data siswa dari file excel"
                file={data.file_excel}
                onFileChange={(file: File | null) => setData("file_excel", file)}
                submitting={onImport}
                onSubmit={handleImport}
                isOpen={importDrawerOpen}
                templatePath="assets/files/template/import-siswa-pkl.xlsx"
                onClose={() => setImportDrawerOpen(false)}
            />

            <div className="text-sm text-gray-500 mb-3 text-center">
                Menampilkan {currentTotal} Siswa {activeMajor} - {activeGelombang === "G1" ? "Gelombang 1" : "Gelombang 2"}
            </div>

            <div className="grid grid-cols-1 mt-1">
                {currentPaginated.length > 0 ? (
                    currentPaginated.map((student) => (
                        <Link key={student.id} href={`/admin/student/${student.id}`}>
                            <Card className="shadow-md p-4 mb-3 flex items-center overflow-hidden justify-between relative">
                                <div className="z-10">
                                    <h3 className="text-xl font-semibold">
                                        {student.nis ?? "NISN tidak ada"}
                                    </h3>
                                    <b><p className="text-base">{student?.full_name}</p></b>
                                    <p className="text-sm">
                                        {student.class ?? "Tanpa kelas"} –{" "}
                                        {student.major ?? "Tanpa jurusan"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        <b>Tempat Prakerin : {student.workshop?.name ?? "Belum ditentukan"}</b>
                                    </p>
                                    {student.gelombang !== null && student.gelombang !== undefined && (
                                        <p className="text-xs text-blue-500 mt-1">
                                            <b>Gelombang : {getGelombangLabel(student.gelombang)}</b>
                                        </p>
                                    )}
                                </div>
                                <ChevronRight size={28} className="text-blue-400 z-10" />
                                <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-blue-100 to-white rounded-l-md" />
                            </Card>
                        </Link>
                    ))
                ) : (
                    <NotFoundInList />
                )}
            </div>

            <PaginationControls
                majorValue={activeMajor}
                gelombang={activeGelombang}
                currentPage={currentCurrentPage}
                totalPages={currentTotalPages}
                total={currentTotal}
                onPageChange={handlePageChange}
            />
        </MainLayout>
    );
}