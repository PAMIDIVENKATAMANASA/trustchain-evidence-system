// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChainOfCustody
 * @dev Smart Contract for maintaining tamper-proof digital evidence records
 * @notice This contract stores evidence hashes (CIDs) with collector information and timestamps
 */
contract ChainOfCustody {
    // Struct to store evidence information
    struct Evidence {
        bytes32 hash;           // IPFS CID hash (converted to bytes32)
        address collector;      // Address of the officer who collected the evidence
        uint256 timestamp;      // Block timestamp when evidence was recorded
        bool exists;            // Flag to check if evidence exists
    }

    // Mapping from evidence ID to Evidence struct
    mapping(uint256 => Evidence) public evidenceRecords;
    
    // Mapping to track which addresses have judge privileges
    mapping(address => bool) public judges;
    
    // Mapping to track which addresses have lawyer privileges
    mapping(address => bool) public lawyers;
    
    // Counter for evidence IDs
    uint256 public evidenceCounter;
    
    // Contract owner (deployer)
    address public owner;

    // Events
    event EvidenceAdded(
        uint256 indexed evidenceId,
        bytes32 indexed hash,
        address indexed collector,
        uint256 timestamp
    );
    
    event JudgeGranted(address indexed judge);
    event JudgeRevoked(address indexed judge);
    event LawyerGranted(address indexed lawyer);
    event LawyerRevoked(address indexed lawyer);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyJudge() {
        require(judges[msg.sender] || msg.sender == owner, "Only judge can perform this action");
        _;
    }

    /**
     * @dev Constructor - sets the contract owner
     */
    constructor() {
        owner = msg.sender;
        evidenceCounter = 0;
    }

    /**
     * @dev Add evidence to the blockchain
     * @param _hash The IPFS CID hash (bytes32) of the evidence file
     * @param _collector The address of the officer collecting the evidence
     * @return evidenceId The unique ID assigned to this evidence
     */
    function addEvidence(bytes32 _hash, address _collector) external returns (uint256) {
        require(_hash != bytes32(0), "Hash cannot be zero");
        require(_collector != address(0), "Collector address cannot be zero");
        
        evidenceCounter++;
        uint256 evidenceId = evidenceCounter;
        
        evidenceRecords[evidenceId] = Evidence({
            hash: _hash,
            collector: _collector,
            timestamp: block.timestamp,
            exists: true
        });
        
        emit EvidenceAdded(evidenceId, _hash, _collector, block.timestamp);
        
        return evidenceId;
    }

    /**
     * @dev Get the original hash stored on blockchain for verification
     * @param _evidenceId The ID of the evidence to verify
     * @return hash The original hash stored on blockchain
     * @return collector The address of the collector
     * @return timestamp The timestamp when evidence was recorded
     * @return exists Whether the evidence record exists
     */
    function getOriginalHash(uint256 _evidenceId) 
        external 
        view 
        returns (
            bytes32 hash,
            address collector,
            uint256 timestamp,
            bool exists
        ) 
    {
        Evidence memory evidence = evidenceRecords[_evidenceId];
        return (
            evidence.hash,
            evidence.collector,
            evidence.timestamp,
            evidence.exists
        );
    }

    /**
     * @dev Check if evidence exists
     * @param _evidenceId The ID of the evidence to check
     * @return exists Whether the evidence record exists
     */
    function evidenceExists(uint256 _evidenceId) external view returns (bool) {
        return evidenceRecords[_evidenceId].exists;
    }

    /**
     * @dev Grant judge privileges to an address (only owner)
     * @param _judge The address to grant judge privileges to
     */
    function grantJudge(address _judge) external onlyOwner {
        require(_judge != address(0), "Invalid address");
        judges[_judge] = true;
        emit JudgeGranted(_judge);
    }

    /**
     * @dev Revoke judge privileges from an address (only owner)
     * @param _judge The address to revoke judge privileges from
     */
    function revokeJudge(address _judge) external onlyOwner {
        judges[_judge] = false;
        emit JudgeRevoked(_judge);
    }

    /**
     * @dev Grant lawyer privileges to an address (only owner)
     * @param _lawyer The address to grant lawyer privileges to
     */
    function grantLawyer(address _lawyer) external onlyOwner {
        require(_lawyer != address(0), "Invalid address");
        lawyers[_lawyer] = true;
        emit LawyerGranted(_lawyer);
    }

    /**
     * @dev Revoke lawyer privileges from an address (only owner)
     * @param _lawyer The address to revoke lawyer privileges from
     */
    function revokeLawyer(address _lawyer) external onlyOwner {
        lawyers[_lawyer] = false;
        emit LawyerRevoked(_lawyer);
    }

    /**
     * @dev Check if an address has judge privileges
     * @param _address The address to check
     * @return hasAccess Whether the address has judge privileges
     */
    function isJudge(address _address) external view returns (bool) {
        return judges[_address] || _address == owner;
    }

    /**
     * @dev Check if an address has lawyer privileges
     * @param _address The address to check
     * @return hasAccess Whether the address has lawyer privileges
     */
    function isLawyer(address _address) external view returns (bool) {
        return lawyers[_address];
    }

    /**
     * @dev Get total number of evidence records
     * @return count The total number of evidence records
     */
    function getEvidenceCount() external view returns (uint256) {
        return evidenceCounter;
    }
}
