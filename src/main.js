import { ethers } from "./ethers-5.6.esm.min.js";
import { fundMeAddress, abi } from "./constants.js";

const connect = async (event) => {
  if (typeof window.ethereum != "undefined") {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (accounts.length && accounts[0].length === 42) {
      event.target.setAttribute("disabled", "");
      event.target.textContent = "Connected";
    }
  }
};

const fundClickHandler = async (provider, contract, inputRef) => {
  console.log("##fundValue", inputRef.value);
  if (Number.isFinite(+inputRef.value)) {
    const transactionResponse = await contract.fund({
      value: ethers.utils.parseEther(inputRef.value),
    });
    // hey, wait for the transaction to be finished
    await listenForTransactionMine(transactionResponse, provider);
    inputRef.value = "";
    console.log("##Done");
  }
};

const listenForTransactionMine = (transactionResponse, provider) => {
  console.log(`Mining ${transactionResponse.hash}...`);
  // listen for this transaction to be finished
  return new Promise((resolve, reject) => {
    provider.once(transactionResponse.hash, (transactionReceipt) => {
      console.log(
        `Completed with ${transactionReceipt.confirmations} confirmations`
      );
      resolve();
    });
  });
};

const balanceClickHandler = async (contract, balanceElemRef) => {
  const balance = await contract.getContractBalance();
  balanceElemRef.textContent = `${ethers.utils.formatEther(balance)} ETH`;
  console.log("##Balance", ethers.utils.formatEther(balance));
};

const withdrawClickHandler = async (
  contract,
  provider,
  signer,
  userBalance
) => {
  const transactionResponse = await contract.withdraw();
  await listenForTransactionMine(transactionResponse, provider);
  await getSignerBalance(signer, userBalance);
};

const getSignerBalance = async (signer, userBalanceElementRef) => {
  const balance = await signer.getBalance();
  if (balance) {
    userBalanceElementRef.textContent = ethers.utils.formatEther(balance);
  }
};

(async () => {
  try {
    // HTML Element refence of Connect to Metamask button
    const connectMetamaskBtn = document.querySelector("#connect-to-metamask");
    connectMetamaskBtn.addEventListener("click", connect);

    const fundButton = document.querySelector("#fund-the-contract");

    const balanceButton = document.querySelector("#contract-balance");

    const withdrawButton = document.querySelector("#withdraw-balance");

    const userAddress = document.querySelector("#user-address");

    const userBalance = document.querySelector("#user-balance");

    const etherInput = document.querySelector("#ether-input-field");

    const contractBalance = document.querySelector("#get-total-balance");

    if (typeof window.ethereum != "undefined") {
      // Get the provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(fundMeAddress, abi, signer);

      // Registering Fund button event listener
      fundButton.addEventListener("click", () =>
        fundClickHandler(provider, contract, etherInput)
      );

      // Registering Balance button event listener
      balanceButton.addEventListener("click", () =>
        balanceClickHandler(contract, contractBalance)
      );

      // Registering Withdraw button event listener
      withdrawButton.addEventListener("click", () =>
        withdrawClickHandler(contract, provider, signer, userBalance)
      );

      /** Send eth_accounts request to detect the app connection
       * with Metamask during page load
       */
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length && accounts[0].length === 42) {
        connectMetamaskBtn.setAttribute("disabled", "");
        connectMetamaskBtn.textContent = "Connected!";
        // Display the user address
        userAddress.textContent = accounts[0];
        // Display the signer's account balance
        await getSignerBalance(signer, userBalance);
      } else {
        connectMetamaskBtn.removeAttribute("disabled");
        connectMetamaskBtn.textContent = "Connect to Metamask";
        // Clear the user address
        userAddress.textContent = "";
      }
    } else {
      connectMetamaskBtn.textContent = "Please install Metamask!";
      connectMetamaskBtn.setAttribute("disabled", "");
    }
  } catch (err) {
    console.error("##Error", err?.message);
  }
})();
