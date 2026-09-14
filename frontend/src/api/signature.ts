import axios from 'axios';

export interface SignatureResponse {
    id: string;
    documentId: string;
    signedByUserId: string;
    signedByUserEmail: string;
    signedByUserFullName: string;
    signedAt: string;
    algorithm: string;
    isValid: boolean;
}

export const signDocument = async (documentId: string): Promise<SignatureResponse> => {
    const response = await axios.post(`/api/documents/${documentId}/signatures`);
    return response.data;
};

export const getSignatures = async (documentId: string): Promise<SignatureResponse[]> => {
    const response = await axios.get(`/api/documents/${documentId}/signatures`);
    return response.data;
};
