import { useState, useCallback } from 'react';

type DownloadFileOptions = {
  url: string;
  from: string;
};

const useDownloadFile = (options: DownloadFileOptions) => {
  // const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // // useEffect(() => {
  // const downloadFile = async (fileName) => {
  //   try {
  //     const response = await fetch(url + fileName);
  //     const blob = await response.blob();
  //     const url = URL.createObjectURL(blob);
  //     setDownloadUrl(url);
  //   } catch (error) {
  //     console.error('Error downloading file:', error);
  //   }
  // };

  // // downloadFile();

  // return () => {
  //   if (downloadUrl) {
  //     URL.revokeObjectURL(downloadUrl);
  //   }
  // };
  // // }, [fileUrl]);

  // const [data, setData] = useState<T>(options.defaultState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);


  async function downloadFile(fileName: string, extension?: string) {
    try {
      // console.log('download file route has started', fileName);
      const response = await fetch(`${options.url}/${fileName}`);
      if (!response.ok) {
        // console.log('200 error in useFetchData hook')
        throw new Error(`Error: ${response.status}`);
      }
      const blob = await response.blob();
      // console.log('download file route has succeeded', blob);
      // save the file to the client
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${fileName}${extension ? `.${extension}` : ''}}`;
      link.click();
    } catch (error) {
      console.log(error, 'download file route has failed');
      if (error instanceof Error) {
        setError(error);
      } else {
        setError(new Error('An unknown error occurred.'));
      }
    } finally {
      setIsLoading(false)
    }
  }

  const downloadTxt = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { downloadFile, downloadTxt, isLoading, error };
};

export default useDownloadFile;
