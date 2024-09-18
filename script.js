const contractAddress = '0x54673e24D608E5135Eb0F6628E2179a72f1aF6aD';
const abi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "category",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "referrer",
                "type": "address"
            }
        ],
        "name": "buyTicket",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "category",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "buyer",
                "type": "address"
            }
        ],
        "name": "TicketPurchased",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "category",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "prizeAmount",
                "type": "uint256"
            }
        ],
        "name": "LotteryWinner",
        "type": "event"
    }
];

const usdtAddress = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // USDT contract address

const usdtAbi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const web3 = new Web3(window.ethereum || 'https://arb1.arbitrum.io/rpc/');
let contract;
let usdtContract;
let userAddress;
let transactionInProgress = false; // Variable to track transaction status

// Initialize the contract and wallet connection
async function init() {
    try {
        if (window.ethereum) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await web3.eth.getAccounts();
            userAddress = accounts[0];
            contract = new web3.eth.Contract(abi, contractAddress);
            usdtContract = new web3.eth.Contract(usdtAbi, usdtAddress);
            document.getElementById('wallet-address').innerText = userAddress;

            const networkId = await web3.eth.net.getId();
            if (networkId !== 42161) {
                document.getElementById('network-info').innerText = 'Please switch to the Arbitrum One network.';
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xa4b1' }] // 42161 in hex
                    });
                } catch (switchError) {
                    console.error(switchError);
                    alert("Failed to switch network. Please switch manually in MetaMask.");
                }
            } else {
                document.getElementById('network-name').innerText = 'Arbitrum One';
            }

            // Event listener for the buy ticket buttons
            document.querySelectorAll('.buy-ticket').forEach(button => {
                button.addEventListener('click', async (e) => {
                    if (!transactionInProgress) { // Check if a transaction is in progress
                        const category = e.target.getAttribute('data-category');
                        const referrerAddress = document.getElementById('referral-input').value.trim() || '0x0000000000000000000000000000000000000000';

                        if (!web3.utils.isAddress(referrerAddress)) {
                            alert('Invalid referrer address. Please enter a valid Ethereum address.');
                            return;
                        }

                        await buyTicket(category, referrerAddress);
                    } else {
                        alert('Transaction is already in progress. Please wait.');
                    }
                });
            });

            listenForEvents();
        } else {
            alert("No Ethereum provider detected. Please install MetaMask.");
        }
    } catch (error) {
        handleError(error);
    }
}

// Buy ticket function
async function buyTicket(category, referrerAddress) {
    try {
        transactionInProgress = true; // Set transaction status to true
        document.getElementById('loading').style.display = 'block'; // Show loading message

        const balance = await web3.eth.getBalance(userAddress);
        if (parseFloat(web3.utils.fromWei(balance, 'ether')) < 0.01) {
            alert('You do not have enough ETH to cover transaction fees.');
            transactionInProgress = false;
            document.getElementById('loading').style.display = 'none';
            return;
        }

        const decimals = await usdtContract.methods.decimals().call();
        const amount = 5 * (10 ** decimals); // 5 USDT

        const allowance = await usdtContract.methods.allowance(userAddress, contractAddress).call();
        if (parseInt(allowance) < amount) {
            await usdtContract.methods.approve(contractAddress, amount).send({ from: userAddress });
        }

        await contract.methods.buyTicket(category, referrerAddress).send({ from: userAddress });
        alert('Ticket purchased successfully!');
    } catch (error) {
        handleError(error);
    } finally {
        transactionInProgress = false; // Always reset the flag
        document.getElementById('loading').style.display = 'none'; // Hide loading message
    }
}

// Listen for contract events
function listenForEvents() {
    contract.events.TicketPurchased({ fromBlock: 'latest' })
        .on('data', (event) => {
            // Handle ticket purchase event
            console.log('Ticket purchased:', event);
            // Update UI or perform other actions based on the event data
        })
        .on('error', (error) => {
            console.error('Error:', error);
        });

    contract.events.LotteryWinner({ fromBlock: 'latest' })
        .on('data', (event) => {
            // Handle lottery winner event
            console.log('Lottery winner:', event);
            // Update UI or perform other actions based on the event data
        })
        .on('error', (error) => {
            console.error('Error:', error);
        });
}

// Handle errors
function handleError(error) {
    console.error('Error:', error);
    alert('An error occurred: ' + error.message);
}

// Start the initialization
init();
