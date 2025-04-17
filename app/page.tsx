"use client"
import React, {useState, useEffect, useCallback} from 'react'
import axios from 'axios';
import { FileCsv } from "@/types";
import { format } from 'date-fns';
import Papa from 'papaparse';
import { FixedSizeList as List } from "react-window";

function Home() {
   
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successAlert, setSuccessAlert] = useState(false);
  const [failAlert, setFailAlert] = useState(false);

  const [files, setFiles] = useState<FileCsv[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTable, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);

   

  const MAX_FILE_SIZE = 500 * 1024 * 1024;


  const fetchFiles = useCallback(async () => {
    try {
    
      setProgressValue(0)
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BACKEND_SERVICE}files/allFiles`);
      if (Array.isArray(response.data)) {

        
        setFiles(response.data);
        
      } else {
        throw new Error(" Unexpected response format");
      }
    } catch (error) {
      console.log(error);
      setError("Failed to fetch stored Files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgressValue(0)
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
   
      alert("File too large :(  ");
      return;
    }
    setIsUploading(true);

    const File = file;
    const chunk_size = 0.15 * 1024 * 1024; // Chunk size set to 0.15 MB
    let offset = 0;
    let chunk_number = 0;

    while (offset < File?.size) {

      const chunk = file.slice(offset, offset + chunk_size);

        // Create a blob from the chunk
        const chunk_blob = new Blob([chunk], { type: File.type });

        // Create a FormData object to send chunk data
        const formData = new FormData();
        formData.append("file", chunk_blob);
        formData.append("fileName", File.name);
        formData.append("chunkNumber", String(chunk_number));
        const chunkSize = Math.ceil(File?.size / chunk_size)
        formData.append(
          "totalChunks",
          String(chunkSize)
        );

       
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BACKEND_SERVICE}upload/`, formData);
        if (response.status == 200){
          setProgressValue(Math.ceil((chunk_number/chunkSize)*100))
          if (response.data.progress == "done"){
            setProgressValue(100)
            setIsUploading(false);
            setSuccessAlert(true);
          }

         
        }else{
          setIsUploading(false);
          setFailAlert(true);
        }

    
        offset += chunk_size;
        chunk_number += 1;
      
    }
    

    setIsUploading(false);

    
  };




  const handleDownload = async (fileId: string, preview: boolean) => {
    try {
 
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BACKEND_SERVICE}files/getFile`,  {
        params: {
          fileId : fileId
        }
    });
      const downloadUrl = response.data.result;

      const fileResponse = await axios.get(downloadUrl, {
        responseType: 'blob',
      });

      if (preview) {

        let tempRow: string[][] = []
        setTableLoading(true)
        Papa.parse(downloadUrl, {
          download: true,
          
      
         
          
          step: function(result){
            tempRow.push(result.data as string[])
           
          },
      
          complete: () => {
            setCsvData(tempRow as string[][]); 
            setTableLoading(false)
          },
          error: (err) => {
            console.error('Error parsing CSV:', err);
            setTableLoading(false)
          },
        });


        return null
      }

      const url = window.URL.createObjectURL(fileResponse.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', (fileId).slice((fileId).indexOf('_') + 1)); 
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error('Download failed', error);
    }
  };

 
  const Row = ({ index, style }: { index: number, style: any }) => {
    
              if (!csvData[index]) return null;


              return(
               
                <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100" style={style}> 
                  <table className="table-sm" > 
                    <tbody>

              <tr key={index}>
                {csvData[index].map((cellObj, cellIndex) => (
                  <td key={cellIndex} className="min-w-[15rem] max-w-[15rem] whitespace-normal">{cellObj} </td>
                ))}
              </tr>
             
                </tbody>
                </table>
                </div>


                )
              };
  

            
const getItemSize = () => Math.floor(Math.random() * 10) + 90;;


  function bytesToSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
    if (bytes === 0) {
      return 'n/a';
    }
  
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }


   
    return (
      <>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">🚀 fast minio upload 📂</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
        
         
          <div>
            <label className="label">
              <span className="label-text">provide CSV File to store</span>
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="file-input file-input-bordered w-full"
              required
            />
          </div>
          <div>


          <progress className="progress progress-primary w-56" value={progressValue} max="100"   > </progress> 
           {"               "}{progressValue}% 
          </div>
      
          
            
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isUploading}
          >
            {isUploading ? "⏳ Uploading..." : "🚀 Upload File"}
          </button>
        </form>
  
        {successAlert && (
          <div className="toast toast-center">
            <div className="alert alert-success">
              <span>file uploaded successfull !!</span>
            </div>
          </div>
        )}
  
        {failAlert && (
          <div className="toast toast-center">
            <div className="alert alert-info">
              <span>Failed to upload file; contact admin.</span>
            </div>
          </div>
        )}


<div className="container mx-auto p-4">


<h1 className="text-2xl font-bold">
  CSV files on Storage
{"   "}
<button className="btn mt-15" onClick={fetchFiles}>

  {loading ? (<span className="loading loading-spinner"></span>) :   "refresh"}
</button>
  
  </h1> 


{files.length === 0 && loading ? (
  <div className="text-center text-lg text-gray-500">
    No CSV files available, start uploading now
  </div>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {files.map((file) => (
    <div className="card bg-secondary text-primary-content w-96" 
    key={file.file_id}
    >
    <div className="card-body">
      <h2 className="card-title">{(file.filename).slice((file.filename).indexOf('_') + 1)}</h2>
      <p>{bytesToSize(file.file_size)}</p>

      <p>{format(new Date(file.uploaded_at), "do MMM yyyy, h:mm a")}</p>
      
      <div className="card-actions justify-end pt-5">
      <button className="btn" 
      
   
      
      onClick={()=>{(document.getElementById('my_modal_2') as HTMLDialogElement).showModal();


        handleDownload(file.filename, true);

      }

      }>
        
    
        
         Preview </button>

         
        <button className="btn" onClick={() => handleDownload(file.filename, false)}>Download</button>
      </div>

      <dialog id="my_modal_2" className="modal">
  <div className="modal-box max-w-7xl" data-theme="light">
    
 

    {loadingTable && (<><span className="loading loading-spinner"></span> parsing and loading table... </>)  }
  



   
  {!loadingTable && csvData.length > 0 && (
   
   <>
<div className="overflow-x-auto">

     <List
       height={1800}
       itemCount={csvData.length > 1 ? csvData.length - 1 : 0}
    
      itemSize={60}
      width={3000}
     >
       {Row}
     </List>
   
 </div></>


  )}

    
   



  </div>
  <form method="dialog" className="modal-backdrop">
    <button onClick={() => setCsvData([])}>close</button>
  </form>
</dialog>
      
      
    </div>
  </div>
    ))}
  </div>
)}

{error && (
  <div className="toast toast-center">
    <div className="alert alert-info">
      <span>Error loading files from minio; contact admin</span>
    </div>
  </div>
)}
</div>
      </div>








      <footer className="footer bg-base-800 text-base-content border-base-300 border-t px-10 py-4">
  <aside className="grid-flow-col items-center">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fillRule="evenodd"
      clipRule="evenodd"
      className="fill-current">
      <path
        d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
    </svg>
   
      by <a className="link link-hover" href="https://nalindeepan007.github.io/CVissfolio/">NaliN deepaN </a>
    
  </aside>
  
</footer>



</>
    );
}

export default Home