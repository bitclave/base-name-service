import { should } from 'chai';
import { mock, instance, verify } from 'ts-mockito';
import { Runner } from './../runner';
import { WealthValidator } from './../wealthValidator';

should();

describe('Runner', function() {
    it('should run Wealth Validator method "workingCycle"', () => {
        const mockedWealthValidator: WealthValidator = mock(WealthValidator);
        const worker: WealthValidator = instance(mockedWealthValidator);
        const runner = new Runner(1000, worker);
        runner.start();

        setInterval(()=>{
            runner.stop();
            verify(mockedWealthValidator.workingCycle()).times(4);
        }, 5000);



        // result.should.equals('Hello World', `Should return: Hello World, but returned: ${result}`);
    });
});
