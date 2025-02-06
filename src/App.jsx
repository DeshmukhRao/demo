import { useState, useEffect } from "react";
import { ethers } from "ethers"; // Import ethers
import lighthouse from '@lighthouse-web3/sdk';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const API_KEY = process.env.REACT_APP_LIGHTHOUSE_API_KEY;

const ABI = [
  {
    "inputs": [{ "internalType": "string", "name": "cid", "type": "string" }],
    "name": "addPrompt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getPromptCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "promptId", "type": "uint256" }
    ],
    "name": "getPrompt",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
];

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [promptCount, setPromptCount] = useState(0);
  const [prompts, setPrompts] = useState([]);
  const [metadata, setMetadata] = useState({
    name: "",
    description: "",
    category: "ML"
  });

  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum); // Use BrowserProvider
        setProvider(provider);
        await connectWallet(provider);
      } else {
        alert("MetaMask not detected");
      }
    }
    init();
  }, []);

  const connectWallet = async (provider) => {
    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      const signer = await provider.getSigner(); // Use await for getSigner
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      setContract(contract);
      fetchPromptCount(contract, accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect MetaMask. Please try again.");
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleInputChange = (event) => {
    setMetadata({ ...metadata, [event.target.name]: event.target.value });
  };

  const uploadToLighthouse = async () => {
    if (!selectedFile) return alert("Select a file to upload");
  
    // Callback function to track the progress
    const progressCallback = (progressData) => {
      const percentageDone = ((progressData?.uploaded / progressData?.total) * 100).toFixed(2);
      console.log(`Upload Progress: ${percentageDone}%`);
    };
  
    try {
      // Upload the file to Lighthouse
      const response = await lighthouse.upload(selectedFile, API_KEY, null, progressCallback);
  
      const cid = response.data.Hash; // Get the CID of the uploaded file
      console.log("Uploaded to Lighthouse. CID:", cid);
  
      // Store the CID in the smart contract
      if (contract) {
        const tx = await contract.addPrompt(cid);
        await tx.wait();
        alert("Prompt stored successfully");
        fetchPromptCount(contract, account);
      }
    } catch (error) {
      console.error("Error uploading to Lighthouse or storing in contract:", error);
      alert("Failed to upload or store prompt. Please try again.");
    }
  };
  
  const fetchPromptCount = async (contract, user) => {
    try {
      // Fetch the prompt count (likely a BigNumber)
      const count = await contract.getPromptCount(user);
      
      // Ensure the value is a BigNumber and use toNumber() if it's safe
      if (count && count.toNumber) {
        setPromptCount(count.toNumber());
      } else {
        console.error("Invalid value for prompt count", count);
      }
    } catch (error) {
      console.error("Error fetching prompt count:", error);
    }
  };
  
  const fetchUserPrompts = async () => {
    if (!contract) return;

    try {
      let retrievedPrompts = [];
      for (let i = 0; i < promptCount; i++) {
        const cid = await contract.getPrompt(account, i);
        const promptData = await fetchPromptFromLighthouse(cid);
        retrievedPrompts.push(promptData);
      }
      setPrompts(retrievedPrompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      alert("Failed to retrieve prompts. Please try again.");
    }
  };

  const fetchPromptFromLighthouse = async (cid) => {
    try {
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching prompt from Lighthouse:", error);
      return null;
    }
  };

  return (
    <div className="App">
      <h1>Decentralized Prompt Marketplace</h1>
      <p>Connected Account: {account || "Not connected"}</p>
      <button onClick={() => connectWallet(provider)}>Connect MetaMask</button>
      <br /><br />

      <h3>Upload Prompt</h3>
      <input type="text" name="name" placeholder="Prompt Name" onChange={handleInputChange} />
      <textarea name="description" placeholder="Description" onChange={handleInputChange} />
      <select name="category" onChange={handleInputChange}>
        <option value="ML">Machine Learning</option>
        <option value="Blockchain">Blockchain</option>
        <option value="Data Science">Data Science</option>
      </select>
      <input type="file" onChange={handleFileChange} />
      <button onClick={uploadToLighthouse}>Upload & Store</button>
      <br /><br />

      <h3>Your Stored Prompts ({promptCount})</h3>
      <button onClick={fetchUserPrompts}>Fetch My Prompts</button>
      <ul>
        {prompts.map((prompt, index) => (
          <li key={index}>
            <strong>Name:</strong> {prompt.name} <br />
            <strong>Description:</strong> {prompt.description} <br />
            <strong>Category:</strong> {prompt.category} <br />
            <strong>Content:</strong> {prompt.content} <br />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;