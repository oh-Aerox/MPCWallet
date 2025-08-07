const EC = require('elliptic').ec;
const keccak = require('keccak');

const ec = new EC('secp256k1');
const key = ec.genKeyPair();

const privateKey = key.getPrivate('hex');
const publicKey = key.getPublic(false, 'hex').slice(2); // 去掉 0x04 前缀

// 以太坊地址 = keccak256(publicKey) 的最后 40 位
const address = keccak('keccak256').update(Buffer.from(publicKey, 'hex')).digest('hex').slice(-40);

console.log('Private Key:', privateKey);
console.log('Public Key:', publicKey);
console.log('Wallet Address: 0x' + address);

// 测试签名验证
const message = Buffer.from('Hello, MPC Wallet!');
const messageHash = keccak('keccak256').update(message).digest();

try {
  // 使用密钥对进行签名
  const signature = key.sign(messageHash);
  console.log('签名:', signature.toDER("hex"));
  
  // 验证签名 - 使用密钥对的公钥
  const isValid = key.verify(messageHash, signature);
  console.log('签名验证:', isValid);
  
  // 也可以使用从私钥重新生成的密钥对来验证
  const keyFromPrivate = ec.keyFromPrivate(privateKey, 'hex');
  const isValid2 = keyFromPrivate.verify(messageHash, signature);
  console.log('使用私钥重新生成密钥对的验证:', isValid2);
  
} catch (error) {
  console.log('签名验证失败:', error.message);
}