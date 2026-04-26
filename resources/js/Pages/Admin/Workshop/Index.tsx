import { ImportFileDrawer, SearchInput } from "@/Components/custom/FormElement";
import NotFoundInList from "@/Components/custom/NotFoundInList";
import { Button } from "@/Components/ui/button";
import { Card } from "@/Components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { MainLayout } from "@/Layouts/MainLayout";
import { PageTitle } from "@/Partials/PageTitle";
import { inputDebounce } from "@/Services/additionalService";
import { Link, router, useForm } from "@inertiajs/react";
import { ArrowUpFromLine, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { ChangeEvent, useState, useEffect, useRef } from "react";
import { usePage } from "@inertiajs/react";
import BlastSonner, { BlastType } from "@/Components/custom/BlastSonner";
import { Workshop } from "@/Types/workshop";

export type AdminWorkshopIndexProps = {
    title?: string;
    workshops: Workshop[];
};

const MAJORS = [
    { value: "TKJ",  label: "TEKNIK KOMPUTER JARINGAN", shortLabel: "TKJ"  },
    { value: "TSM",  label: "TEKNIK SEPEDA MOTOR",      shortLabel: "TSM"  },
    { value: "TBOG", label: "TATA BOGA",                shortLabel: "TBOG" },
] as const;

type MajorValue = typeof MAJORS[number]["value"];

const OWNER_LABEL_BY_MAJOR: Record<MajorValue, string> = {
    TKJ:  "Owner",
    TSM:  "Pimpinan / Mekanik",
    TBOG: "Chef",
};

const PER_PAGE = 20;

function filterByMajor(data: Workshop[], majorValue: MajorValue): Workshop[] {
    const majorLabel = MAJORS.find((m) => m.value === majorValue)?.label ?? "";

    return data.filter((workshop) => {
        const students: any[] = (workshop as any).students ?? [];

        if (students.length === 0) return false;

        return students.some((student) => {
            const m = student.major?.toUpperCase().trim() ?? "";
            return m === majorLabel.toUpperCase() || m === majorValue.toUpperCase();
        });
    });
}

type PaginationControlsProps = {
    majorValue: MajorValue;
    currentPage: number;
    totalPages: number;
    total: number;
    onPageChange: (major: MajorValue, page: number) => void;
};

function PaginationControls({
    majorValue,
    currentPage,
    totalPages,
    total,
    onPageChange,
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * PER_PAGE + 1;
    const endItem   = Math.min(currentPage * PER_PAGE, total);

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
                <span className="font-semibold text-gray-700">{total}</span> lokasi
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(majorValue, currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((pageNum) => (
                    <button
                        key={pageNum}
                        type="button"
                        onClick={() => onPageChange(majorValue, pageNum)}
                        className={`flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-semibold transition-colors ${
                            pageNum === currentPage
                                ? "bg-green-500 border-green-500 text-white shadow"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                        {pageNum}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => onPageChange(majorValue, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

export default function AdminWorkshopIndex({ title, workshops }: AdminWorkshopIndexProps) {
    const { flash } = usePage().props as any;

    const [workshopsData, setWorkshopsData] = useState<Workshop[]>(workshops);
    const [searchValue, setSearchValue]     = useState<string>("");
    const [activeTab, setActiveTab]         = useState<MajorValue>("TKJ");
    const [pages, setPages] = useState<Record<MajorValue, number>>({
        TKJ:  1,
        TSM:  1,
        TBOG: 1,
    });

    const [importDrawerOpen, setImportDrawerOpen] = useState<boolean>(false);
    const [onImport, setOnImport]                 = useState<boolean>(false);

    const { data, post, setData } = useForm({ file_excel: null as File | null });
    const flashedRef = useRef<string>("");

    useEffect(() => {
        if (flash?.success && flashedRef.current !== flash.success) {
            flashedRef.current = flash.success;
            BlastSonner({ type: BlastType.SUCCESS, message: flash.success });
        }
        if (flash?.error && flashedRef.current !== flash.error) {
            flashedRef.current = flash.error;
            BlastSonner({ type: BlastType.ERROR, message: flash.error });
        }
    }, [flash]);

    const handleImport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.file_excel) return;

        setOnImport(true);
        post(`/admin/workshop/import`, {
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
            "/admin/workshop",
            { search: value },
            {
                preserveState: true,
                replace: true,
                onSuccess: (page: any) => {
                    setWorkshopsData(page.props.workshops as Workshop[]);
                    setPages({ TKJ: 1, TSM: 1, TBOG: 1 });
                },
            }
        );
    });

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);
        debouncedSearch(value);
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value as MajorValue);
        setSearchValue("");
        setPages((prev) => ({ ...prev, [value as MajorValue]: 1 }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePageChange = (majorValue: MajorValue, page: number) => {
        setPages((prev) => ({ ...prev, [majorValue]: page }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const getPageData = (majorValue: MajorValue) => {
        const filtered    = filterByMajor(workshopsData, majorValue);
        const totalPages  = Math.ceil(filtered.length / PER_PAGE) || 1;
        const currentPage = Math.min(pages[majorValue] ?? 1, totalPages);
        const start       = (currentPage - 1) * PER_PAGE;
        const paginated   = filtered.slice(start, start + PER_PAGE);
        return { paginated, totalPages, total: filtered.length, currentPage };
    };

    const getMajorCount = (majorValue: MajorValue) =>
        filterByMajor(workshops, majorValue).length;
    const currentOwnerLabel = OWNER_LABEL_BY_MAJOR[activeTab];

    return (
        <MainLayout title="Data Lokasi Prakerin">
            <PageTitle
                title={title as string}
                description="Lokasi Prakerin yang terdaftar di sistem"
            />

            <Tabs
                defaultValue="TKJ"
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full mb-5"
            >
                <TabsList className="grid w-full grid-cols-3">
                    {MAJORS.map((major) => (
                        <TabsTrigger key={major.value} value={major.value} className="flex gap-2">
                            {major.shortLabel}
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                                {getMajorCount(major.value)}
                            </span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {MAJORS.map((major) => {
                    const { paginated, totalPages, total, currentPage } = getPageData(major.value);
                    const ownerLabel = OWNER_LABEL_BY_MAJOR[major.value];
                    
                    return (
                        <TabsContent key={major.value} value={major.value} className="mt-4">
                            <SearchInput
                                className="mb-5"
                                value={searchValue}
                                onChange={handleSearch}
                                placeholder={`Cari Lokasi Prakerin atau alamatnya - Jurusan ${major.shortLabel}`}
                            />

                            <Link href="/admin/workshop/create">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full bg-green-200 border mb-3 hover:bg-green-300 flex justify-center items-center gap-2"
                                >
                                    <PlusCircle size={20} />
                                    <span>Tambah Lokasi Prakerin</span>
                                </Button>
                            </Link>

                            <Button
                                size="lg"
                                onClick={() => setImportDrawerOpen(true)}
                                variant="outline"
                                className="w-full bg-blue-200 border mb-5 hover:bg-blue-300 flex justify-center items-center gap-2"
                            >
                                <ArrowUpFromLine size={20} />
                                <span>Import Data Lokasi Prakerin</span>
                            </Button>

                            <ImportFileDrawer
                                title="Import Data Lokasi Prakerin"
                                description="Import data Lokasi Prakerin dari file excel"
                                file={data.file_excel}
                                onFileChange={(file: File | null) => setData("file_excel", file)}
                                submitting={onImport}
                                onSubmit={handleImport}
                                isOpen={importDrawerOpen}
                                templatePath="assets/files/template/import-lokasi-pkl.xlsx"
                                onClose={() => setImportDrawerOpen(false)}
                            />

                            <div className="grid grid-cols-1 mt-1">
                                {paginated.length > 0 ? (
                                    paginated.map((workshop) => {
                                        const majorLabel = MAJORS.find(m => m.value === major.value)?.label ?? "";
                                        const majorStudentCount = ((workshop as any).students ?? []).filter(
                                            (s: any) => {
                                                const m = s.major?.toUpperCase().trim() ?? "";
                                                return m === majorLabel.toUpperCase() || m === major.value.toUpperCase();
                                            }
                                        ).length;

                                        return (
                                            <Link key={workshop.id} href={`/admin/workshop/${workshop.id}`}>
                                                <Card className="shadow-md p-4 mb-3 flex items-center overflow-hidden justify-between relative">
                                                    <div className="z-10">
                                                        <h3 className="text-xl font-semibold">
                                                            {workshop.name}
                                                        </h3>
                                                        <p className="text-base">
                                                            {workshop?.owner_name} ({ownerLabel}) –{" "}
                                                            <span className="text-sm">
                                                                {workshop?.phone ?? "No telp tidak ada"}
                                                            </span>
                                                        </p>
                                                        <p className="text-sm">{workshop?.address}</p>
                                                        {workshop?.supervisor && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                <b>Pembimbing : {workshop.supervisor.full_name}</b>
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-green-600 mt-1 font-medium">
                                                            <b>Siswa {major.shortLabel} : {majorStudentCount} orang</b>
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={28} className="text-green-400 z-10" />
                                                    <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-green-100 to-white rounded-l-md" />
                                                </Card>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <NotFoundInList />
                                )}
                            </div>

                            <PaginationControls
                                majorValue={major.value}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                total={total}
                                onPageChange={handlePageChange}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>
        </MainLayout>
    );
}