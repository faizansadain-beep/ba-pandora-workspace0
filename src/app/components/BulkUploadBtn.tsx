import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Btn } from "./SharedUI";
import * as XLSX from 'xlsx';

export function BulkUploadBtn({ onUpload, isLoading = false }: { onUpload: (data: any[]) => void, isLoading?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        // Get first worksheet
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(ws);
        
        onUpload(data); // Send data back to the parent view
      } catch (err) {
        alert("Failed to parse Excel file. Ensure it is a valid .xlsx or .csv");
        console.error(err);
      } finally {
        setParsing(false);
        // Reset input so the same file can be uploaded again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <>
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <Btn 
        variant="secondary" 
        onClick={() => fileInputRef.current?.click()}
        disabled={parsing || isLoading}
      >
        <Upload size={13} />
        {parsing ? "Parsing..." : "Bulk Upload"}
      </Btn>
    </>
  );
}
