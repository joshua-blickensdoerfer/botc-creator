import axios from 'axios';

const BASE_URL = 'http://localhost:8080'; // Replace this with your actual backend URL

export const fetchData = async (endpoint: string, nameFilter?: string) => {
  try {
    const response = await axios.get(`${BASE_URL}/${endpoint}`, {
      params: {
        nameFilter: nameFilter // pass the filter parameter if it's provided
      }
    });
    console.log(response.data)
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Handle error as per your requirement
  }
};
